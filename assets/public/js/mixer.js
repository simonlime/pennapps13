
// This code will make you cry. It was written in a mad 
// dash during Music Hack Day Boston 2012, and has
// quite a bit of hackage of the bad kind in it.

var remixer;
var player;
var driver;
var track;
var W = 900, H = 700;
var paper;

// configs for chances to branch
var defaultMinRandomBranchChance = .18
var defaultMaxRandomBranchChance = .5

var defaultRandomBranchChanceDelta =.012;
var minRandomBranchChanceDelta =.000;
var maxRandomBranchChanceDelta =.100;

var highlightColor = "#00ff00";
var selectColor = "#ff0000";
var uploadingAllowed = true;
var debugMode = true;

var shifted = false;
var controlled = false;


var jukeboxData = {
    infiniteMode:true,      // if true, allow branching
    maxBranches : 4,        // max branches allowed per beat
    maxBranchThreshold :80, // max allowed distance threshold

    computedThreshold: 0,   // computed best threshold
    currentThreshold: 0,    // current in-use max threshold
    addLastEdge: true,      // if true, optimize by adding a good last edge
    justBackwards: false,   // if true, only add backward branches
    justLongBranches: false,// if true, only add long branches
    removeSequentialBranches: false,// if true, remove consecutive branches of the same distance

    deletedEdgeCount: 0,    // number of edges that have been deleted

    lastBranchPoint : 0,    // last beat with a good branch
    longestReach : 0,       // longest looping secstion

    beatsPlayed:0,          // total number of beats played
    totalBeats : 0,         // total number of beats in the song
    branchCount: 0,         // total number of active branches

    selectedTile : null,    // current selected tile
    selectedCurve : null,   // current selected branch

    tiles: [],              // all of the tiles
    allEdges: [],           // all of the edges
    deletedEdges: [],       // edges that should be deleted

    minRandomBranchChance: 0,
    maxRandomBranchChance: 0,
    randomBranchChanceDelta: 0,
    curRandomBranchChance : 0,
    lastThreshold : 0,
};


// From Crockford, Douglas (2008-12-17). JavaScript: The Good Parts (Kindle Locations 734-736). Yahoo Press.

if (typeof Object.create !== 'function') { 
    Object.create = function (o) { 
        var F = function () {};
        F.prototype = o; 
        return new F(); 
    }; 
}


function info(s) {
    $("#info").text(s);
}


function error(s) {
    if (s.length == 0) {
        $("#error").hide();
    } else {
        $("#error").text(s);
        $("#error").show();
    }
}

function setDisplayMode(playMode) {
    if (playMode) {
        $("#song-div").hide();
        $("#select-track").hide();
        $("#running").show();
        $(".rotate").hide();
    } else {
        listPopularTracks();
        $("#song-div").show();
        $("#select-track").show();
        $("#running").hide();
        $(".rotate").show();
    } 
}

function hideAll() {
    $("#song-div").hide();
    $("#select-track").hide();
    $("#running").hide();
    $(".rotate").hide();
}


function stop() {
    player.stop();
    player = remixer.getPlayer();
}

function createTiles(qtype) {
    return createTileCircle(qtype, 300);
}

function createTileCircle(qtype, radius) {
    var start = now();
    var y_padding = 50;
    var x_padding = 110;
    var maxWidth = 90;
    var tiles = [];
    var qlist = track.analysis[qtype];
    var n = qlist.length;
    var R = radius;
    var alpha = Math.PI * 2 / n;
    var perimeter = 2 * n * R * Math.sin(alpha/2);
    var a = perimeter / n;
    var width = a * 20;
    var angleOffset = - Math.PI / 2;
    // var angleOffset = 0;

    if (width > maxWidth) {
        width = maxWidth;
    }

    var angle = angleOffset;
    for (var i = 0; i < qlist.length; i++) {
        var tile = createNewTile(i, qlist[i], a, width);
        var y = y_padding + R + R  * Math.sin(angle);
        var x = x_padding + R + R * Math.cos(angle);
        tile.move(x, y);
        tile.rotate(angle);
        tiles.push(tile);
        angle += alpha;
    }

    // now connect every tile to its neighbors

    // a horrible hack until I figure out 
    // geometry
    var roffset = width / 2;
    var yoffset = width * .52;
    var xoffset = width * 1;
    var center = ' S 450 350 '
    var branchCount = 0;
    R -= roffset;
    for (var i = 0; i < tiles.length; i++) {
        var startAngle = alpha * i + angleOffset;
        var tile = tiles[i];
        var y1 = y_padding + R + R * Math.sin(startAngle) + yoffset;
        var x1 = x_padding + R + R * Math.cos(startAngle) + xoffset;


        for (var j = 0; j < tile.q.neighbors.length; j++) {
            var destAngle = alpha * tile.q.neighbors[j].dest.which + angleOffset;
            var y2 = y_padding + R + R * Math.sin(destAngle) + yoffset;
            var x2 = x_padding + R + R * Math.cos(destAngle) + xoffset;

            var path = 'M' + x1 + ' ' + y1 + center + x2 + ' ' + y2;
            branchCount ++;
        }
    }
    jukeboxData.branchCount = branchCount;
    return tiles;
}

function addCurveClickHandler(curve) {
    curve.click( 
        function() {
            if (jukeboxData.selectedCurve) {
                highlightCurve(jukeboxData.selectedCurve, false);
            }
            selectCurve(curve, true);
            jukeboxData.selectedCurve = curve;
        });

    curve.mouseover(
        function() {
            highlightCurve(curve, true);
        }
    );

    curve.mouseout (
        function() {
            if (curve != jukeboxData.selectedCurve) {
                highlightCurve(curve, false);
            }
        }
    );
}

function highlightCurve(curve, enable) {
    if (curve) {
        if (enable) {
            curve.attr('stroke-width', 6);
            curve.attr('stroke', highlightColor);
            curve.attr('stroke-opacity', 1.0);
            curve.toFront();
        } else {
            if (curve.edge) {
                curve.attr('stroke-width', 3);
                curve.attr('stroke', curve.edge.src.tile.quantumColor);
                curve.attr('stroke-opacity', .7);
            }
        }
    }
}

function selectCurve(curve) {
    curve.attr('stroke-width', 6);
    curve.attr('stroke', selectColor);
    curve.attr('stroke-opacity', 1.0);
    curve.toFront();
}


function extractTitle(url) {
    var lastSlash = url.lastIndexOf('/');
    if (lastSlash >= 0 && lastSlash < url.length - 1) {
        var res =  url.substring(lastSlash + 1, url.length - 4);
        return res;
    } else {
        return url;
    }
}

function getTitle(title, artist, url) {
    if (title == undefined || title.length == 0 || title === '(unknown title)' || title == 'undefined') {
        if (url) {
            title = extractTitle(url);
        } else {
            title = null;
        }
    } else {
        if (artist !== '(unknown artist)') {
            title = title + ' by ' + artist;
        } 
    }
    return title;
}


function trackReady(t) {
    jukeboxData.minLongBranch = track.analysis.beats.length / 5;
}


function readyToPlay(t) {
    setDisplayMode(true);
    driver = Driver(player);
    info("ready!");
    //normalizeColor();
    trackReady(t);
    drawVisualization();
    driver.start();
}

function drawVisualization() {
    if (track) {
        if (jukeboxData.currentThreshold == 0) {
            dynamicCalculateNearestNeighbors('beats');
        } else {
            calculateNearestNeighbors('beats', jukeboxData.currentThreshold);
        }
        createTilePanel('beats');
    }
}


function gotTheAnalysis(profile) {
    var status = get_status(profile);
    if (status == 'complete') {
        info("Loading track ...");
        remixer.remixTrack(profile.response.track, function(state, t, percent) {
            track = t;
            if (state == 1) {
                info("Calculating pathways through the song ...");
                setTimeout( function() { readyToPlay(t); }, 10);
            } else if (state == 0) {
                if (percent >= 99) {
                    info("Calculating pathways through the song ...");
                } else {
                    info( percent  + "% of track loaded ");
                }
            } else {
                info('Trouble  ' + t.status);
                setDisplayMode(false);
            }
        });
    } else if (status == 'error') {
        info("Sorry, couldn't analyze that track");
        setDisplayMode(false);
    }
}


function listSong(r) {
    var title = getTitle(r.title, r.artist, null);
    var item = null;
    if (title) {
        var item = $('<li>').append(title);

        item.attr('class', 'song-link');
        item.click(function() {
                showPlotPage(r.id);
            });
    } 
    return item;
}

function listSongAsAnchor(r) {
    var title = getTitle(r.title, r.artist, r.url);
    var item = $('<li>').html('<a href="index.html?trid=' + r.id + '">' + title + '</a>');
    return item;
}

function listTracks(active, tracks) {
    $('#song-div').show();
    $('#song-list').empty();
    $('.sel-list').removeClass('activated');
    $(active).addClass('activated');
    for (var i = 0; i < tracks.length; i++) {
        var s = tracks[i];
        var item = listSong(s);
        if (item) {
            $('#song-list').append(listSong(s));
        }
    }
}

function listPopularTracks() {

}

function listRecentTracks() {
    $.getJSON('recent_tracks', { count : 60}, function(data) {
        listTracks('#recent-list', data);
        ga_track('list', 'recent-tracks', '');
    });
}

function listTopUploadedTracks() {
    listTracks('#upload-list',  topUploadedSongs);
        ga_track('list', 'top-uploaded', '');
}

function analyzeAudio(audio, tag, callback) {
    var url = 'qanalyze'
    $.getJSON(url, { url:audio, tag:tag}, function(data) {
        if (data.status === 'done' || data.status === 'error') {
            callback(data);
        } else {
            info(data.status + ' - ready in about ' + data.estimated_wait + ' secs. ');
            setTimeout(function() { analyzeAudio(audio, tag, callback); }, 5000);
        } 
    });
}

// first see if it is in in S3 bucket, and if not, get the analysis from
// the labs server

function noCache() {
    return { "noCache" : now() }
}

function fetchAnalysis(trid) {
    var url = 'http://static.echonest.com/infinite_jukebox_data/' + trid + '.json';
    info('Fetching the analysis');
    $.getJSON(url, function(data) { gotTheAnalysis(data); } )
        .error( function() { 
            info("Sorry, can't find info for that track");
        });
}

function get_status(data) {
    if (data.response.status.code == 0) {
        return data.response.track.status;
    } else {
        return 'error';
    }
}


function fetchSignature() {
    var url = 'policy'
    $.getJSON(url, {}, function(data) {
        policy = data.policy;
        signature = data.signature;
        $('#f-policy').val(data.policy);
        $('#f-signature').val(data.signature);
        $('#f-key').val(data.key);
    });
}


function calculateDim(numTiles, totalWidth, totalHeight) {
    var area = totalWidth * totalHeight;
    var tArea = area / (1.2 * numTiles);
    var dim = Math.floor(Math.sqrt(tArea));
    return dim;
}


var timbreWeight = 1, pitchWeight = 10, 
    loudStartWeight = 1, loudMaxWeight = 1, 
    durationWeight = 100, confidenceWeight = 1;

function get_seg_distances(seg1, seg2) {
    var timbre = seg_distance(seg1, seg2, 'timbre', true);
    var pitch = seg_distance(seg1, seg2, 'pitches');
    var sloudStart = Math.abs(seg1.loudness_start - seg2.loudness_start);
    var sloudMax = Math.abs(seg1.loudness_max - seg2.loudness_max);
    var duration = Math.abs(seg1.duration - seg2.duration);
    var confidence = Math.abs(seg1.confidence - seg2.confidence);
    var distance = timbre * timbreWeight + pitch * pitchWeight + 
        sloudStart * loudStartWeight + sloudMax * loudMaxWeight + 
        duration * durationWeight + confidence * confidenceWeight;
    return distance;
}

function dynamicCalculateNearestNeighbors(type) {
    var count = 0;
    var targetBranchCount =  track.analysis[type].length / 6;

    precalculateNearestNeighbors(type, jukeboxData.maxBranches, jukeboxData.maxBranchThreshold);

    for (var threshold = 10; threshold < jukeboxData.maxBranchThreshold; threshold += 5) {
        count = collectNearestNeighbors(type, threshold);
        if (count >= targetBranchCount) {
            break;
        }
    }
    jukeboxData.currentThreshold = jukeboxData.computedThreshold = threshold;
    postProcessNearestNeighbors(type);
    return count;
}

function postProcessNearestNeighbors(type) {
    removeDeletedEdges();

    if (jukeboxData.addLastEdge) {
        if (longestBackwardBranch(type) < 50) {
            insertBestBackwardBranch(type, jukeboxData.currentThreshold, 65);
        } else {
            insertBestBackwardBranch(type, jukeboxData.currentThreshold, 55);
        }
    }
    calculateReachability(type);
    jukeboxData.lastBranchPoint = findBestLastBeat(type);
    filterOutBadBranches(type, jukeboxData.lastBranchPoint);
    if (jukeboxData.removeSequentialBranches) {
        filterOutSequentialBranches(type);
    }
    setTunedURL();
}

function removeDeletedEdges() {
    for (var i = 0; i < jukeboxData.deletedEdges.length; i++) {
        var edgeID = jukeboxData.deletedEdges[i];
        if (edgeID in jukeboxData.allEdges) {
            var edge = jukeboxData.allEdges[edgeID];
            deleteEdge(edge);
        }
    }
    jukeboxData.deletedEdges = [];
}

function getAllDeletedEdgeIDs() {
    var results = [];
    for (var i = 0; i < jukeboxData.allEdges.length; i++) {
        var edge = jukeboxData.allEdges[i];
        if (edge.deleted) {
            results.push(edge.id);
        }
    }
    return results;
}

function getDeletedEdgeString() {
    var ids = getAllDeletedEdgeIDs();
    if (ids.length > 0) {
        return '&d=' + ids.join(',');
    } else {
        return "";
    }
}


function calculateNearestNeighbors(type, threshold) {
    precalculateNearestNeighbors(type, jukeboxData.maxBranches, jukeboxData.maxBranchThreshold);
    count = collectNearestNeighbors(type, threshold);
    postProcessNearestNeighbors(type, threshold);
    return count;
}


function resetTuning() {
    undeleteAllEdges();

    jukeboxData.addLastEdge = true;
    jukeboxData.justBackwards = false;
    jukeboxData.justLongBranches = false;
    jukeboxData.removeSequentialBranches = false;
    jukeboxData.currentThreshold = jukeboxData.computedThreshold;
    jukeboxData.minRandomBranchChance = defaultMinRandomBranchChance;
    jukeboxData.maxRandomBranchChance = defaultMaxRandomBranchChance;
    jukeboxData.randomBranchChanceDelta = defaultRandomBranchChanceDelta,

    jukeboxData.minRandomBranchChance = defaultMinRandomBranchChance;
    jukeboxData.maxRandomBranchChance = defaultMaxRandomBranchChance;
    jukeboxData.randomBranchChanceDelta = defaultRandomBranchChanceDelta;

    drawVisualization();
}


function undeleteAllEdges() {
    jukeboxData.deletedEdgeCount = 0;
    for (var i = 0; i < jukeboxData.allEdges.length; i++) {
        var edge = jukeboxData.allEdges[i];
        if (edge.deleted) {
            edge.deleted = false;
        }
    }
}


function setTunedURL() {
    if (track) {
        var edges = getDeletedEdgeString();
        var addBranchParams = false;
        var lb = '';

        if (!jukeboxData.addLastEdge) {
            lb='&lb=0';
        }

        var p = '?trid=' + track.id + edges + lb;

        if (jukeboxData.justBackwards) {
            p += '&jb=1'
        }

        if (jukeboxData.justLongBranches) {
            p += '&lg=1'
        }

        if (jukeboxData.removeSequentialBranches) {
            p += '&sq=0'
        }

        if (jukeboxData.currentThreshold != jukeboxData.computedThreshold) {
            p +=  '&thresh=' + jukeboxData.currentThreshold;
        } 

        if (jukeboxData.minRandomBranchChance != defaultMinRandomBranchChance) {
            addBranchParams = true;
        }
        if (jukeboxData.maxRandomBranchChance != defaultMaxRandomBranchChance) {
            addBranchParams = true;
        }

        if (jukeboxData.randomBranchChanceDelta != defaultRandomBranchChanceDelta) {
            addBranchParams = true;
        }

        if (addBranchParams) {
            p += '&bp=' + [   
            Math.round(map_value_to_percent(jukeboxData.minRandomBranchChance, 0,1)),
            Math.round(map_value_to_percent(jukeboxData.maxRandomBranchChance, 0, 1)),
            Math.round(map_value_to_percent(jukeboxData.randomBranchChanceDelta, 
                                                minRandomBranchChanceDelta, maxRandomBranchChanceDelta))].join(',')
        }
        history.replaceState({}, document.title, p);
        tweetSetup(track);
    }
}


function now() {
    return new Date().getTime();
}


// we want to find the best, long backwards branch
// and ensure that it is included in the graph to
// avoid short branching songs like:
// http://labs.echonest.com/Uploader/index.html?trid=TRVHPII13AFF43D495

function longestBackwardBranch(type) {
    var longest = 0
    var quanta = track.analysis[type];
    for (var i = 0; i < quanta.length; i++) {
        var q = quanta[i];
        for (var j = 0; j < q.neighbors.length; j++) {
            var neighbor = q.neighbors[j];
            var which = neighbor.dest.which;
            var delta = i - which;
            if (delta > longest) {
                longest = delta;
            }
        }
    }
    var lbb =  longest * 100 / quanta.length;
    return lbb;
}

function insertBestBackwardBranch(type, threshold, maxThreshold) {
    var found = false;
    var branches = [];
    var quanta = track.analysis[type];
    for (var i = 0; i < quanta.length; i++) {
        var q = quanta[i];
        for (var j = 0; j < q.all_neighbors.length; j++) {
            var neighbor = q.all_neighbors[j];

            if (neighbor.deleted) {
                continue;
            }

            var which = neighbor.dest.which;
            var thresh = neighbor.distance;
            var delta = i - which;
            if (delta > 0  &&  thresh < maxThreshold) {
                var percent = delta * 100 / quanta.length;
                var edge = [percent, i, which, q, neighbor]
                branches.push(edge);
            }
        }
    }

    if (branches.length === 0) {
        return;
    }

    branches.sort( 
        function(a,b) {
            return a[0] - b[0];
        }
    )
    branches.reverse();
    var best = branches[0];
    var bestQ = best[3];
    var bestNeighbor = best[4];
    var bestThreshold = bestNeighbor.distance;
    if (bestThreshold > threshold) {
        bestQ.neighbors.push(bestNeighbor);
        // console.log('added bbb from', bestQ.which, 'to', bestNeighbor.dest.which, 'thresh', bestThreshold);
    } else {
        // console.log('bbb is already in from', bestQ.which, 'to', bestNeighbor.dest.which, 'thresh', bestThreshold);
    }
}

function calculateReachability(type) {
    var maxIter = 1000;
    var iter = 0;
    var quanta = track.analysis[type];

    for (var qi = 0; qi < quanta.length; qi++)  {
        var q = quanta[qi];
        q.reach = quanta.length - q.which;
    }

    for (iter = 0; iter < maxIter; iter++) {
        var changeCount = 0;
        for (qi = 0; qi < quanta.length; qi++)  {
            var q = quanta[qi];
            var changed = false;

            for (var i = 0; i < q.neighbors.length; i++) {
                var q2 = q.neighbors[i].dest;
                if (q2.reach > q.reach) {
                    q.reach = q2.reach;
                    changed = true;
                }
            }

            if (qi < quanta.length -1) {
                var q2 = quanta[qi +1];
                if (q2.reach > q.reach) {
                    q.reach = q2.reach;
                    changed = true;
                }
            }

            if (changed) {
                changeCount++;
                for (var j = 0; j < q.which; j++) {
                    var q2 = quanta[j];
                    if (q2.reach < q.reach) {
                        q2.reach = q.reach;
                    }
                }
            }
        }
        if (changeCount == 0) {
            break;
        }
    }

    if (false) {
        for (var qi = 0; qi < quanta.length; qi++)  {
            var q = quanta[qi];
            console.log(q.which, q.reach, Math.round(q.reach * 100 / quanta.length));
        }
    }
    // console.log('reachability map converged after ' + iter + ' iterations. total ' + quanta.length);
}


function map_percent_to_range(percent, min, max) {
    percent = clamp(percent, 0, 100);
    return (max - min) * percent / 100. + min;
}

function map_value_to_percent(value, min, max) {
    value = clamp(value, min, max);
    return 100 * (value - min) / (max - min);
}

function clamp(val, min, max) {
    return val < min ? min : val > max ? max : val;
}


function findBestLastBeat(type) {
    var reachThreshold = 50;
    var quanta = track.analysis[type];
    var longest = 0;
    var longestReach = 0;
    for (var i = quanta.length -1; i >=0; i--) {
        var q = quanta[i];
        //var reach = q.reach * 100 / quanta.length;
        var distanceToEnd = quanta.length - i;

        // if q is the last quanta, then we can never go past it
        // which limits our reach

        var reach = (q.reach  - distanceToEnd) * 100 / quanta.length;

        if (reach > longestReach && q.neighbors.length > 0) {
            longestReach = reach;
            longest = i;
            if (reach >= reachThreshold) {
                break;
            }
        }
    }
    // console.log('NBest last beat is', longest, 'reach', longestReach, reach);

    jukeboxData.totalBeats = quanta.length;
    jukeboxData.longestReach = longestReach;
    return longest
}

function filterOutBadBranches(type, lastIndex) {
    var quanta = track.analysis[type];
    for (var i = 0; i < lastIndex; i++) {
        var q = quanta[i];
        var newList = [];
        for (var j = 0; j < q.neighbors.length; j++) {
            var neighbor = q.neighbors[j];
            if (neighbor.dest.which < lastIndex) {
                newList.push(neighbor);
            } else {
                 // console.log('filtered out arc from', q.which, 'to', neighbor.dest.which);
            }
        }
        q.neighbors = newList;
    }
}

function hasSequentialBranch(q, neighbor) {
    var qp = q.prev;
    if (qp) {
        var distance = q.which - neighbor.dest.which;
        for (var i = 0; i < qp.neighbors.length; i++) {
            var odistance = qp.which - qp.neighbors[i].dest.which;
            if (distance == odistance) {
                return true;
            }
        }
    } 
    return false;
}

function filterOutSequentialBranches(type) {
    var quanta = track.analysis[type];
    for (var i = quanta.length - 1; i >= 1; i--) {
        var q = quanta[i];
        var newList = [];

        for (var j = 0; j < q.neighbors.length; j++) {
            var neighbor = q.neighbors[j];
            if (hasSequentialBranch(q, neighbor)) {
                // skip it
            } else {
                newList.push(neighbor);
            }
        }
        q.neighbors = newList;
    }
}

function calculateNearestNeighborsForQuantum(type, maxNeighbors, maxThreshold, q1) {
    var edges = [];
    var id = 0;
    for (var i = 0; i < track.analysis[type].length; i++) {

        if (i === q1.which) {
            continue;
        }

        var q2 = track.analysis[type][i];
        var sum = 0;
        for (var j = 0; j < q1.overlappingSegments.length; j++) {
            var seg1 = q1.overlappingSegments[j];
            var distance = 100;
            if (j < q2.overlappingSegments.length) {
                var seg2 = q2.overlappingSegments[j];
                // some segments can overlap many quantums,
                // we don't want this self segue, so give them a
                // high distance
                if (seg1.which === seg2.which) {
                    distance = 100
                } else {
                    distance = get_seg_distances(seg1, seg2);
                }
            } 
            sum += distance;
        }
        var pdistance = q1.indexInParent == q2.indexInParent ? 0 : 100;
        var totalDistance = sum / q1.overlappingSegments.length + pdistance;
        if (totalDistance < maxThreshold) {
            var edge = { 
                id : id,
                src : q1,
                dest : q2,
                distance : totalDistance,
                curve : null,
                deleted: false
            };
            edges.push( edge );
            id++;
        }
    }

    edges.sort( 
        function(a,b) {
            if (a.distance > b.distance) {
                return 1;
            } else if (b.distance > a.distance) {
                return -1;
            } else {
                return 0;
            }
        }
    );

    q1.all_neighbors = [];
    for (i = 0; i < maxNeighbors && i < edges.length; i++) {
        var edge = edges[i];
        q1.all_neighbors.push(edge);

        edge.id = jukeboxData.allEdges.length;
        jukeboxData.allEdges.push(edge);
    }
}


function precalculateNearestNeighbors(type, maxNeighbors, maxThreshold) {
    // skip if this is already done 
    if ('all_neighbors' in track.analysis[type][0]) {
        return;
    }
    jukeboxData.allEdges = [];
    for (var qi = 0; qi < track.analysis[type].length; qi++)  {
        var q1 = track.analysis[type][qi];
        calculateNearestNeighborsForQuantum(type, maxNeighbors, maxThreshold, q1);
    }
}

function collectNearestNeighbors(type, maxThreshold) {
    var branchingCount = 0;
    for (var qi = 0; qi < track.analysis[type].length; qi++)  {
        var q1 = track.analysis[type][qi];
        q1.neighbors = extractNearestNeighbors(q1,maxThreshold);
        if (q1.neighbors.length > 0) {
            branchingCount += 1;
        }
    }
    return branchingCount;
}


function extractNearestNeighbors(q, maxThreshold) {
    var neighbors = [];

    for (var i = 0; i < q.all_neighbors.length; i++) {
        var neighbor = q.all_neighbors[i];

        if (neighbor.deleted) {
            continue;
        }

        if (jukeboxData.justBackwards && neighbor.dest.which > q.which) {
            continue;
        }

        if (jukeboxData.justLongBranches && Math.abs(neighbor.dest.which - q.which) < jukeboxData.minLongBranch) {
            continue;
        }

        var distance = neighbor.distance;
        if (distance <= maxThreshold) {
            neighbors.push(neighbor);
        }
    }
    return neighbors;
}

function seg_distance(seg1, seg2, field, weighted) {
    if (weighted) {
        return euclidean_distance(seg1[field], seg2[field]);
    } else {
        return euclidean_distance(seg1[field], seg2[field]);
    }
}

function calcBranchInfo(type) {
    var histogram = {}
    var total = 0;
    for (var qi = 0; qi < track.analysis[type].length; qi++)  {
        var q = track.analysis[type][qi];
        for (var i = 0; i < q.neighbors.length; i++) {
            var neighbor = q.neighbors[i];
            var distance = neighbor.distance;
            var bucket = Math.round(distance / 10);
            if (! (bucket in histogram)) {
                histogram[bucket] = 0;
            }
            histogram[bucket] +=1;
            total += 1;
        }
    }
    console.log(histogram);
    console.log('total branches', total);
}


function euclidean_distance(v1, v2) {
    var sum = 0;

    for (var i = 0; i < v1.length; i++) {
        var delta = v2[i] - v1[i];
        sum += delta * delta;
    }
    return Math.sqrt(sum);
}

function weighted_euclidean_distance(v1, v2) {
    var sum = 0;

    //for (var i = 0; i < 4; i++) {
    for (var i = 0; i < v1.length; i++) {
        var delta = v2[i] - v1[i];
        //var weight = 1.0 / ( i + 1.0);
        var weight = 1.0;
        sum += delta * delta * weight;
    }
    return Math.sqrt(sum);
}

var tilePrototype = {
    normalColor:"#5f9",

    move: function(x,y)  {
        if (this.label) {
            this.label.attr( { x:x + 2, y: y + 8});
        }
    },

    rotate: function(angle)  {
        var dangle = 360 * (angle / (Math.PI * 2));
    },

    play:function(force) {
        if (force || shifted) {
            this.playStyle();
            player.play(0, this.q);
        } else if (controlled) {
            this.queueStyle();
            player.queue(this.q);
        } else {
            this.selectStyle();
        }
        if (force) {
            info("Selected tile " + this.q.which);
            jukeboxData.selectedTile = this;
        }
    },



    selectStyle: function() {
    },

    queueStyle: function() {
    },

    pauseStyle: function() {
    },

    playStyle: function() {
       if (!this.isPlaying) {
           this.isPlaying = true;
           if (!this.isScaled) {
               //this.rect.scale(1.5, 1.5);
               this.isScaled = true;
           }
           // this.rect.toFront();
           // this.rect.attr("fill", highlightColor);
           // highlightCurves(this, true);
        }
    },

    normal: function() {
       // this.rect.attr("fill", this.normalColor);
       // if (this.isScaled) {
       //     this.isScaled = false;
       //     this.rect.scale(1/1.5, 1/1.5);
       // }
       // highlightCurves(this, false);
       this.isPlaying = false;
    },

    init:function() {
        var that = this;
    }
}

function highlightCurves(tile, enable) {
    for (var i = 0; i < tile.q.neighbors.length; i++) {
        var curve = tile.q.neighbors[i].curve;
        highlightCurve(curve, enable);
        if (driver.isRunning()) {
            break; // just highlight the first one
        }
    }
}

function getQuantumColor(q) {
    if (isSegment(q)) {
        return getSegmentColor(q);
    } else {
        q = getQuantumSegment(q);
        if (q != null) {
            return getSegmentColor(q);
        } else {
            return "#000";
        }
    }
}

function getQuantumSegment(q) {
    return q.oseg;
}


function isSegment(q) {
    return 'timbre' in q;
}

function getBranchColor(q) {
    if (q.neighbors.length == 0) {
        return to_rgb(0, 0, 0);
    } else {
        var red = q.neighbors.length / jukeboxData.maxBranches;
        var color = to_rgb(red, 0, (1. - red));
        return color;
    }
}

function createNewTile(which, q, height, width) {
    var padding = 0;
    var tile = Object.create(tilePrototype);
    tile.which = which;
    tile.width = width;
    tile.height =  height;
    // tile.branchColor = getBranchColor(q);
    // tile.quantumColor = getQuantumColor(q);
    // tile.normalColor = tile.quantumColor;
    tile.isPlaying = false;
    tile.isScaled = false;

    tile.q = q;
    tile.init();
    q.tile = tile;
    tile.normal();
    return tile;
}


function createTilePanel(which) {
    removeAllTiles();
    jukeboxData.tiles = createTiles(which);
}

function normalizeColor() {
    cmin = [100,100,100];
    cmax = [-100,-100,-100];

    var qlist = track.analysis.segments;
    for (var i = 0; i < qlist.length; i++) {
        for (var j = 0; j < 3; j++) {
            var t = qlist[i].timbre[j];

            if (t < cmin[j]) {
                cmin[j] = t;
            }
            if (t > cmax[j]) {
                cmax[j] = t;
            }
        }
    }
}

function getSegmentColor(seg) {
    var results = []
    for (var i = 0; i < 3; i++) {
        var t = seg.timbre[i];
        var norm = (t - cmin[i]) / (cmax[i] - cmin[i]);
        results[i] = norm * 255;
        results[i] = norm;
    }
    return to_rgb(results[0], results[1], results[2]);
}

function convert(value) { 
    var integer = Math.round(value);
    var str = Number(integer).toString(16); 
    return str.length == 1 ? "0" + str : str; 
};

function to_rgb(r, g, b) { 
    return "#" + convert(r * 255) + convert(g * 255) + convert(b * 255); 
}

function removeAllTiles() {
    for (var i =0; i < jukeboxData.tiles.length; i++) {
        jukeboxData.tiles[i].rect.remove();
    }
    jukeboxData.tiles = [];
}

function deleteEdge(edge) {
    if (!edge.deleted) {
        jukeboxData.deletedEdgeCount++;
        edge.deleted = true;
        if (edge.curve) {
            edge.curve.remove();
            edge.curve = null;
        }
        for (var j = 0; j < edge.src.neighbors.length; j++) {
            var otherEdge = edge.src.neighbors[j];
            if (edge == otherEdge) {
                edge.src.neighbors.splice(j, 1);
                break;
            }
        }
    }
}

function keydown(evt) {
    if (evt.which == 39) {  // right arrow
        var inc = driver.getIncr();
        driver.setIncr(inc + 1);
        evt.preventDefault();
    }

    if (evt.which == 8 || evt.which == 46) {     // backspace / delete
        evt.preventDefault();
        if (jukeboxData.selectedCurve) {
            deleteEdge(jukeboxData.selectedCurve.edge);
            jukeboxData.selectedCurve = null;
            drawVisualization();
        }
    }

    if (evt.which == 37) {  // left arrow
        evt.preventDefault();
        var inc = driver.getIncr();
        driver.setIncr(inc - 1);
    }

    if (evt.which == 38 ) {  // up arrow
        driver.setIncr(1);
        evt.preventDefault();
    }

    if (evt.which == 40  ) {  // down arrow
        driver.setIncr(0);
        evt.preventDefault();
    }


    if (evt.which == 17) {
        controlled = true;
    }

    if (evt.which == 72) {
        jukeboxData.infiniteMode = !jukeboxData.infiniteMode;
        if (jukeboxData.infiniteMode) {
            info("Infinite Mode enabled");
            ga_track('main', 'infinite-mode', '');
        } else {
            info("Bringing it on home");
            ga_track('main', 'home', '');
        }
    }

    if (evt.which == 16) {
        shifted = true;
    }

    if (evt.which == 32) {
        evt.preventDefault();
        if (driver.isRunning()) {
            driver.stop();
            ga_track('main', 'key-stop', '');
        } else {
            driver.start();
            ga_track('main', 'key-start', '');
        }
    }

}

function isDigit(key) {
    return key >= 48 && key <= 57;
}

function keyup(evt) {
    if (evt.which == 17) {
        controlled = false;
    }
    if (evt.which == 16) {
        shifted = false;
    }
}



function init() {
    window.oncontextmenu = function(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };

    document.ondblclick = function DoubleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }

    $("#error").hide();
    $(document).keydown(keydown);
    $(document).keyup(keyup);


    $("#load").click(
        function() {
            ga_track('main', 'load', '');
            if (!uploadingAllowed) {
                alert("Sorry, uploading is temporarily disabled, while we are under heavy load");
            } else {
                location.href = "loader.html";
            }
        }
    );

    $("#go").click(
        function() {
            if (driver.isRunning()) {
                driver.stop();
                ga_track('main', 'stop', track.id);
            } else {
                driver.start();
                ga_track('main', 'start', track.id);
            }
        }
    );


    $("#new").click(
        function() {
            if (driver) {
                driver.stop();
            }
            setDisplayMode(false);
            listPopularTracks();
            ga_track('main', 'new', '');
        }
    );

    $("#tune").click(
        function() {
            var controls = $("#controls");
            controls.dialog('open');
            ga_track('main', 'tune', '');
        }
    );

    $("#controls").attr("visibility", "visible");


    $("#reset-edges").click(
        function() {
            resetTuning();
            ga_track('main', 'reset', '');
        }
    );

    $("#last-branch").change(
        function(event) {
            if (event.originalEvent) {
                jukeboxData.addLastEdge = $('#last-branch').is(':checked');
                drawVisualization();
            }
        }
    );

    $("#reverse-branch").change(
        function(event) {
            if (event.originalEvent) {
                jukeboxData.justBackwards = $('#reverse-branch').is(':checked');
                drawVisualization();
            }
        }
    );

    $("#long-branch").change(
        function(event) {
            if (event.originalEvent) {
                jukeboxData.justLongBranches = $('#long-branch').is(':checked');
                drawVisualization();
            }
        }
    );

    $("#sequential-branch").change(
        function(event) {
            if (event.originalEvent) {
                jukeboxData.removeSequentialBranches = $('#sequential-branch').is(':checked');
                drawVisualization();
            }
        }
    );

    $("#popular-list").click(listPopularTracks);
    $("#recent-list").click(listRecentTracks);
    $("#upload-list").click(listTopUploadedTracks);


    jukeboxData.minRandomBranchChance = defaultMinRandomBranchChance;
    jukeboxData.maxRandomBranchChance = defaultMaxRandomBranchChance;
    jukeboxData.randomBranchChanceDelta = defaultRandomBranchChanceDelta;


    if (window.webkitAudioContext === undefined) {
        error("Sorry, this app needs advanced web audio. Your browser doesn't"
            + " support it. Try the latest version of Chrome or Safari");

        hideAll();

    } else {
        var context = new webkitAudioContext();
        remixer = createJRemixer(context, $);
        player = remixer.getPlayer();
        processParams();
    }
}

function Driver(player) {
    var curTile = null;
    var curOp = null;
    var incr = 1;
    var nextTile = null;
    var bounceSeed = null;
    var bounceCount = 0;
    var nextTime = 0;
    var lateCounter = 0;
    var lateLimit = 4;

    var beatDiv = $("#beats");
    var timeDiv = $("#time");

    function next() {
        if (curTile == null || curTile == undefined) {
            return jukeboxData.tiles[0];
        } else {
            var nextIndex;
            if (shifted) {
                if (bounceSeed === null) {
                    bounceSeed = curTile;
                    bounceCount = 0;
                }
                if (bounceCount++ % 2 === 1) {
                    return selectNextNeighbor(bounceSeed);
                } else {
                    return bounceSeed;
                }
            } if (controlled) {
                return curTile;
            } else {
                if (bounceSeed != null) {
                    var nextTile = bounceSeed;
                    bounceSeed = null;
                    return nextTile;
                } else {
                    nextIndex = curTile.which + incr
                }
            }

            if (nextIndex < 0) {
                return jukeboxData.tiles[0];
            } else if  (nextIndex >= jukeboxData.tiles.length) {
                curOp = null;
                player.stop();
            } else {
                return selectRandomNextTile(jukeboxData.tiles[nextIndex]);
            }
        }
    }

    function selectRandomNextTile(seed) {
        if (seed.q.neighbors.length == 0) {
            return seed;
        } else if (shouldRandomBranch(seed.q)) {
            var next = seed.q.neighbors.shift();
            jukeboxData.lastThreshold = next.distance;
            seed.q.neighbors.push(next);
            var tile = next.dest.tile;
            return tile;
        } else {
            return seed;
        }
    }

    function selectNextNeighbor(seed) {
        if (seed.q.neighbors.length == 0) {
            return seed;
        } else {
            var next = seed.q.neighbors.shift();
            seed.q.neighbors.push(next);
            var tile = next.dest.tile;
            return tile;
        } 
    }

    function shouldRandomBranch(q) {
        if (jukeboxData.infiniteMode) {
            if (q.which == jukeboxData.lastBranchPoint) {
                return true;
            }
            jukeboxData.curRandomBranchChance += jukeboxData.randomBranchChanceDelta;
            if (jukeboxData.curRandomBranchChance > jukeboxData.maxRandomBranchChance) {
                jukeboxData.curRandomBranchChance = jukeboxData.maxRandomBranchChance;
            }
            var shouldBranch = Math.random() < jukeboxData.curRandomBranchChance;
            if (shouldBranch) {
                jukeboxData.curRandomBranchChance = jukeboxData.minRandomBranchChance;
            }
            return shouldBranch;
        } else {
            return false;
        }
    }

    function updateStats() {
        beatDiv.text(jukeboxData.beatsPlayed);
        timeDiv.text(secondsToTime((now() - startTime) / 1000.));
    }


    function process() {
        if (curTile !== null && curTile !== undefined) {
            curTile.normal();
        }

        if (curOp) {
            if (nextTile != null) {
                curTile = nextTile;
                nextTile = null;
            } else {
                curTile = curOp();
            }

            if (curTile !== null) {
                var ctime = player.curTime();
                // if we are consistently late we should shutdown
                if (ctime > nextTime) {
                    lateCounter++;
                    if (lateCounter++ > lateLimit && windowHidden()) {
                        info("Sorry, can't play music properly in the background");
                        interface.stop();
                        return;
                    }
                } else {    
                    lateCounter = 0;
                }

                nextTime = player.play(nextTime, curTile.q);

                var delta = nextTime - ctime;
                setTimeout( function () { process(); }, 1000 * delta  - 10);
                curTile.playStyle();
                jukeboxData.beatsPlayed += 1;
                updateStats();
            }
        } else {
            if (curTile != null) {
                curTile.normal();
            }
        }
    }

    var startTime = 0;
    var interface = {
        start: function() {
            jukeboxData.beatsPlayed = 0;
            nextTime = 0;
            bounceSeed = null;
            jukeboxData.infiniteMode = true;
            jukeboxData.curRandomBranchChance = jukeboxData.minRandomBranchChance;
            lateCounter = 0;
            curOp = next;
            startTime = now();
            error("");
            info("");
            process();
        },

        stop: function() {
            var delta = now() - startTime;
            $("#go").text('Play');
            if (curTile) {
                curTile.normal();
                curTile = null;
            }
            curOp = null;
            bounceSeed = null;
            incr = 1;
            player.stop();
        },

        isRunning: function() {
            return curOp !== null;
        },

        getIncr: function() {
            return incr;
        },

        getCurTile : function() {
            return curTile;
        },

        setIncr: function(inc) {
            incr = inc;
        }, 

        setNextTile: function(tile) {
            nextTile = tile;
        },
    }
    return interface;
}

function secondsToTime(secs) {
    secs = Math.floor(secs);
    var hours = Math.floor(secs / 3600);
    secs -= hours * 3600;
    var mins = Math.floor(secs/60);
    secs -= mins * 60;

    if (hours < 10) {
        hours = '0' + hours;
    }
    if (mins < 10) {
        mins = '0' + mins;
    }
    if (secs < 10) {
        secs = '0' + secs;
    }
    return hours + ":" + mins + ":" + secs
}

function windowHidden() {
    return document.webkitHidden;
}

function processParams() {
    var params = {};
    var q = document.URL.split('?')[1];
    if(q != undefined){
        q = q.split('&');
        for(var i = 0; i < q.length; i++){
            var pv = q[i].split('=');
            var p = pv[0];
            var v = pv[1];
            params[p] = v;
        }
    }

    if ('trid' in params) {
        var trid = params['trid'];
        var thresh = 0;
        if ('thresh' in params) {
            jukeboxData.currentThreshold = parseInt(params['thresh']);
        }
        if ('d' in params) {
            var df = params['d'].split(',');
            for (var i = 0; i < df.length; i++) {
                var id = parseInt(df[i]);
                jukeboxData.deletedEdges.push(id);
            }
        }
        if ('lb' in params) {
            if (params['lb'] == '0') {
                jukeboxData.addLastEdge = true;
            }
        }

        if ('jb' in params) {
            if (params['jb'] == '1') {
                jukeboxData.justBackwards = true;
            }
        }

        if ('lg' in params) {
            if (params['lg'] == '1') {
                jukeboxData.justLongBranches = true;
            }
        }

        if ('sq' in params) {
            if (params['sq'] == '0') {
                jukeboxData.removeSequentialBranches = true;
            }
        }

        if ('bp' in params) {
            var bp = params['bp'];
            var fields = bp.split(',');
            if (fields.length === 3) {
                var minRange = parseInt(fields[0]);
                var maxRange = parseInt(fields[1]);
                var delta = parseInt(fields[2]);

                jukeboxData.minRandomBranchChance = map_percent_to_range(minRange, 0, 1);
                jukeboxData.maxRandomBranchChance = map_percent_to_range(maxRange, 0, 1);
                jukeboxData.randomBranchChanceDelta = 
                    map_percent_to_range(delta, minRandomBranchChanceDelta, maxRandomBranchChanceDelta);

            }
        }
        setDisplayMode(true);
        fetchAnalysis(trid);
    } else if ('key' in params) {
        var url = 'http://' + params['bucket'] + '/' + urldecode(params['key']);
        info("analyzing audio");
        setDisplayMode(true);
        $("#select-track").hide();
        analyzeAudio(url, 'tag', 
            function(data) {
                if (data.status === 'done') {
                    showPlotPage(data.trid);
                } else {
                    info("Trouble analyzing that track " + data.message);
                }
            }
        );
    }
    else {
        setDisplayMode(false);
    }
}

function showPlotPage(trid) {
    var url = location.protocol + "//" + 
                location.host + location.pathname + "?trid=" + trid;
    location.href = url;
}

function urldecode(str) {
   return decodeURIComponent((str+'').replace(/\+/g, '%20'));
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function isTuned(url) {
    return url.indexOf('&') > 0;
}

function tweetSetup(t) {
    $(".twitter-share-button").remove();
    var tweet = $('<a>')
        .attr('href', "https://twitter.com/share")
        .attr('id', "tweet")
        .attr('class', "twitter-share-button")
        .attr('data-lang', "en")
        .attr('data-count', "none")
        .text('Tweet');

    $("#tweet-span").prepend(tweet);
    if (t) {
        var tuned = '';
        if (isTuned(document.URL)) {
            tuned = 'Tuned ';
        }
        tweet.attr('data-text', tuned + "#InfiniteJukebox of " + t.fixedTitle);
        tweet.attr('data-url', document.URL);
    } 
    // twitter can be troublesome. If it is not there, don't bother loading it
    if ('twttr' in window) {
        twttr.widgets.load();
    }
}

function ga_track(page, action, id) {
    _gaq.push(['_trackEvent', page, action, id]);
}


window.onload = init;















function createJRemixer(context, buf) {

    var remixer = {

        remixTrackById: function(id, callback) {
            var url = 'http://labs.echonest.com/Uploader/profile?callback=?'
            $.getJSON(url, { trid:trid}, function(data) {
                if (data.response.status.code == 0) {
                    remixer.remixTrack(data.response.track, callback)
                }
            });
        },

        remixTrack : function(track, callback) {

            function fetchAudio() {
                track.status = 'ok'
                callback(1, track, 100);
            }

            function preprocessTrack(track) {
                trace('preprocessTrack');
                var types = ['sections', 'bars', 'beats', 'tatums', 'segments'];

                
                for (var i in types) {
                    var type = types[i];
                    trace('preprocessTrack ' + type);
                    for (var j in track.analysis[type]) {
                        var qlist = track.analysis[type]

                        j = parseInt(j)

                        var q = qlist[j]
                        q.track = track;
                        q.which = j;
                        if (j > 0) {
                            q.prev = qlist[j-1];
                        } else {
                            q.prev = null
                        }
                        
                        if (j < qlist.length - 1) {
                            q.next = qlist[j+1];
                        } else {
                            q.next = null
                        }
                    }
                }

                connectQuanta(track, 'sections', 'bars');
                connectQuanta(track, 'bars', 'beats');
                connectQuanta(track, 'beats', 'tatums');
                connectQuanta(track, 'tatums', 'segments');

                connectFirstOverlappingSegment(track, 'bars');
                connectFirstOverlappingSegment(track, 'beats');
                connectFirstOverlappingSegment(track, 'tatums');

                connectAllOverlappingSegments(track, 'bars');
                connectAllOverlappingSegments(track, 'beats');
                connectAllOverlappingSegments(track, 'tatums');


                filterSegments(track);
            }

            function filterSegments(track) {
                var threshold = .3;
                var fsegs = [];
                fsegs.push(track.analysis.segments[0]);
                for (var i = 1; i < track.analysis.segments.length; i++) {
                    var seg = track.analysis.segments[i];
                    var last = fsegs[fsegs.length - 1];
                    if (isSimilar(seg, last) && seg.confidence < threshold) {
                        fsegs[fsegs.length -1].duration += seg.duration;
                    } else {
                        fsegs.push(seg);
                    }
                }
                track.analysis.fsegments = fsegs;
            }

            function isSimilar(seg1, seg2) {
                var threshold = 1;
                var distance = timbral_distance(seg1, seg2);
                return (distance < threshold);
            }

            function connectQuanta(track, parent, child) {
                var last = 0;
                var qparents = track.analysis[parent];
                var qchildren = track.analysis[child];

                for (var i in qparents) {
                    var qparent = qparents[i]
                    qparent.children = [];

                    for (var j = last; j < qchildren.length; j++) {
                        var qchild = qchildren[j];
                        if (qchild.start >= qparent.start 
                                    && qchild.start < qparent.start + qparent.duration) {
                            qchild.parent = qparent;
                            qchild.indexInParent = qparent.children.length;
                            qparent.children.push(qchild);
                            last = j;
                        } else if (qchild.start > qparent.start) {
                            break;
                        }
                    }
                }
            }

            // connects a quanta with the first overlapping segment
            function connectFirstOverlappingSegment(track, quanta_name) {
                var last = 0;
                var quanta = track.analysis[quanta_name];
                var segs = track.analysis.segments;

                for (var i = 0; i < quanta.length; i++) {
                    var q = quanta[i]

                    for (var j = last; j < segs.length; j++) {
                        var qseg = segs[j];
                        if (qseg.start >= q.start) {
                            q.oseg = qseg;
                            last = j;
                            break
                        } 
                    }
                }
            }

            function connectAllOverlappingSegments(track, quanta_name) {
                var last = 0;
                var quanta = track.analysis[quanta_name];
                var segs = track.analysis.segments;

                for (var i = 0; i < quanta.length; i++) {
                    var q = quanta[i]
                    q.overlappingSegments = [];

                    for (var j = last; j < segs.length; j++) {
                        var qseg = segs[j];
                        // seg starts before quantum so no
                        if ((qseg.start + qseg.duration) < q.start) {
                            continue;
                        }
                        // seg starts after quantum so no
                        if (qseg.start > (q.start + q.duration)) {
                            break;
                        }
                        last = j;
                        q.overlappingSegments.push(qseg);
                    }
                }
            }
            preprocessTrack(track);
            fetchAudio();
            // if (track.status == 'complete') {
                
            // } else {
            //     track.status = 'error: incomplete analysis';
            //     callback(false, track);
            // }
        },

        getPlayer : function() {
            var queueTime = 0;
            var audioGain = context.createGainNode();
            var curAudioSource = null;
            var curQ = null;
            audioGain.gain.value = 1;
            audioGain.connect(context.destination);

            function queuePlay(when, q) {
                // console.log('qp', when, q);
                audioGain.gain.value = 1;
                if (isAudioBuffer(q)) {
                    var audioSource = context.createBufferSource();
                    audioSource.buffer = q;
                    audioSource.connect(audioGain);
                    audioSource.noteOn(when);
                    return when;
                } else if ($.isArray(q)) {
                    for (var i in q) {
                        when = queuePlay(when, q[i]);
                    }
                    return when;
                } else if (isQuantum(q)) {
                    var audioSource = context.createBufferSource();
                    audioSource.buffer = q.track.buffer;
                    audioSource.connect(audioGain);
                    audioSource.noteGrainOn(when, q.start, q.duration);
                    q.audioSource = audioSource;
                    return when + q.duration;
                } else {
                    error("can't play " + q);
                    return when;
                }
            }

            function playQuantum(when, q) {
                var now = context.currentTime;
                var start = when == 0 ? now : when;
                var next = start + q.duration;

                if (curQ && curQ.track === q.track && curQ.which + 1 == q.which) {
                    // let it ride
                } else {
                    var audioSource = context.createBufferSource();
                    audioGain.gain.value = 1;
                    audioSource.buffer = q.track.buffer;
                    audioSource.connect(audioGain);
                    var duration = track.audio_summary.duration - q.start;
                    audioSource.noteGrainOn(start, q.start, duration);
                    if (curAudioSource) {
                        curAudioSource.noteOff(start);
                    }
                    curAudioSource = audioSource;
                }
                q.audioSource = curAudioSource;
                curQ = q;
                return next;
            }

            function error(s) {
                console.log(s);
            }

            var player = {
                play: function(when, q) {
                    return playQuantum(when, q);
                    //queuePlay(0, q);
                },

                playNow: function(q) {
                    queuePlay(0, q);
                },

                addCallback: function(callback) {
                },

                queue: function(q) {
                    var now = context.currentTime;
                    if (now > queueTime) {
                        queueTime = now;
                    } 
                    queueTime = queuePlay(queueTime, q);
                },

                queueRest: function(duration) {
                    queueTime += duration;
                },

                stop: function(q) {
                    if (q === undefined) {
                        if (curAudioSource) {
                            curAudioSource.noteOff(0);
                            curAudioSource = null;
                        }
                        //audioGain.gain.value = 0;
                        //audioGain.disconnect();
                    } else {
                        if ('audioSource' in q) {
                            if (q.audioSource != null) {
                                q.audioSource.noteOff(0);
                            }
                        }
                    }
                    curQ = null;
                },

                curTime: function() {
                    return context.currentTime;
                }
            }
            return player;
        },

        fetchSound : function(audioURL, callback) {
            var request = new XMLHttpRequest();

            trace("fetchSound " + audioURL);
            request.open("GET", audioURL, true);
            request.responseType = "arraybuffer";
            this.request = request;

            request.onload = function() {
                var buffer = context.createBuffer(request.response, false);
                callback(true, buffer);
            }

            request.onerror = function(e) {
                callback(false, null);
            }
            request.send();
        },
    };

    function isQuantum(a) {
        return 'start' in a && 'duration' in a;
    }

    function isAudioBuffer(a) {
        return 'getChannelData' in a;
    }

    function trace(text) {
        if (false) {
            console.log(text);
        }
    }

    return remixer;
}


function euclidean_distance(v1, v2) {
    var sum = 0;
    for (var i = 0; i < 3; i++) {
        var delta = v2 - v1;
        sum += delta * delta;
    }
    return Math.sqrt(sum);
}

function timbral_distance(s1, s2) {
    return euclidean_distance(s1.timbre, s2.timbre);
}


function clusterSegments(track, numClusters, fieldName, vecName) {
    var vname = vecName || 'timbre';
    var fname = fieldName || 'cluster';
    var maxLoops = 1000;

    function zeroArray(size) {
        var arry = [];
        for (var i = 0; i < size; i++) {
            arry.push(0);
        }
        return arry;
    }

    function reportClusteringStats() {
        var counts = zeroArray(numClusters);
        for (var i = 0; i < track.analysis.segments.length; i++) {
            var cluster = track.analysis.segments[i][fname];
            counts[cluster]++;
        }
        //console.log('clustering stats');
        for (var i = 0; i < counts.length; i++) {
            //console.log('clus', i, counts[i]);
        }
    }

    function sumArray(v1, v2) {
        for (var i = 0; i < v1.length; i++) {
            v1[i] += v2[i];
        }
        return v1;
    }

    function divArray(v1, scalar) {
        for (var i = 0; i < v1.length; i++) {
            v1[i] /= scalar
        }
        return v1;
    }
    function getCentroid(cluster) {
        var count = 0;
        var segs = track.analysis.segments;
        var vsum = zeroArray(segs[0][vname].length);

        for (var i = 0; i < segs.length; i++) {
            if (segs[i][fname] === cluster) {
                count++;
                vsum = sumArray(vsum, segs[i][vname]);
            }
        }

        vsum = divArray(vsum, count);
        return vsum;
    }

    function findNearestCluster(clusters, seg) {
        var shortestDistance = Number.MAX_VALUE;
        var bestCluster = -1;

        for (var i = 0; i < clusters.length; i++) {
            var distance = euclidean_distance(clusters[i], seg[vname]);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                bestCluster = i;
            }
        }
        return bestCluster;
    }

    // kmeans clusterer
    // use random initial assignments
    for (var i = 0; i < track.analysis.segments.length; i++) {
        track.analysis.segments[i][fname] = Math.floor(Math.random() * numClusters);
    }

    reportClusteringStats();

    while (maxLoops-- > 0) {
        // calculate cluster centroids
        var centroids = [];
        for (var i = 0; i < numClusters; i++) {
            centroids[i] = getCentroid(i);
        }
        // reassign segs to clusters
        var switches = 0;
        for (var i = 0; i < track.analysis.segments.length; i++) {
            var seg = track.analysis.segments[i];
            var oldCluster = seg[fname];
            var newCluster = findNearestCluster(centroids, seg);
            if (oldCluster !== newCluster) {
                switches++;
                seg[fname] = newCluster;
            }
        }
        //console.log("loopleft", maxLoops, 'switches', switches);
        if (switches == 0) {
            break;
        }
    }
    reportClusteringStats();
}