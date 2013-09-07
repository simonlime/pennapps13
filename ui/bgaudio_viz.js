function clearDebug() {
  $("#consolelog").html("");
}

function debug() {
  var el = $("#consolelog").get(0);
  if (!el)
    return;
  el.innerHTML += Array.prototype.join.call(arguments, ", ") + "<br/>";
}

function init() {
  var width = 400;
  var height = 400;
  var cssWidth = 512;
  var cssHeight = 512;

  var screenElement = $("#screen").get(0);
  var audioElement = $("#audio").get(0);
  var scriptElement = $("#vizcode").get(0);

  Pocket.init(screenElement, audioElement, scriptElement, {
    w : width,
    h : height,
    watchHash : true
  });

  $(document).keydown(function(e) {
    if (e.keyCode == 178) {
      if ( typeof soundManager != "undefined")
        soundManager.togglePause("pocketsound");
      else
        audioElement.pause();
    }
    if (e.keyCode == 179) {
      if ( typeof soundManager != "undefined")
        soundManager.togglePause("pocketsound");
      else
        audioElement.play();
    }
  });

  $("#sm2-controls button.start").click(function() {
    soundManager.play("pocketsound");
  });
  $("#sm2-controls button.stop").click(function() {
    soundManager.stop("pocketsound");
  });
  ui = {};
    $("#playpause").click(function() {
    	if(ui.playing == undefined){
    		console.log("undef,, init false");
    		ui.playing = false;
    	}
    	if(ui.playing){
    		soundManager.stop("pocketsound");
    		console.log("stopped");
    	}else{
    soundManager.play("pocketsound");
    }
    ui.playing = !ui.playing;
    console.log(ui.playing);
  });

  $("#code-controls button.show").click(function() {
    $("#presetctr").show();
    $("#code-controls button").show();
    $(this).hide();
  });
  $("#code-controls button.hide").click(function() {
    $("#presetctr").hide();
    $("#code-controls button").hide();
    $("#code-controls button.show").show();
  });

  $("#code-controls button.reload").click(function() {
    Pocket.loadCode($("#vizcode").val());
  });

  $("#vizcode").keyup(function(e) {
    if (e.keyCode == 119) {
      Pocket.loadCode($(this).val());
    }
  });

  $("#presetlist a").click(function(e) {
    $("#presetlist a").removeClass("active");
    $(this).addClass("active").blur();

  });

  var $links = $("#presetlist a");

  var checkKeyNextPrevious = function(e) {
    if (e.which == 37 || e.which == 39) {// left | right {
      for (var i = 0; i < $links.size(); i++) {
        var cur = $links[i];
        if (document.location.hash == $(cur).attr("href")) {
          var prev = i > 0 ? $links[i - 1] : $links.last();
          var next = i < $links.size() - 1 ? $links[i + 1] : $links[0];
          document.location.hash = (e.which == 37 ? $(prev).attr("href") : $(next).attr("href"));
          return;
        }
      }
    }
  }
  var updateScreenSize = function() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var m = Math.min(w, h);

    $("#screencanvas, #processcanvas, #screen").width(m).height(m);
    $("#screen").css("position", "absolute").css("left", (w - m) / 2).css("top", (h - m) / 2);
  }
  var enlarge = function() {
    $("#screen").unbind("click", enlarge);
    $(".page-elements").hide();
    $("body, html").css("backgroundColor", "rgb(0,0,0)");

    updateScreenSize();

    $("#screen").click(reset);
    $(document).bind("keyup", checkKeyNextPrevious);
    $(window).bind("resize", updateScreenSize);
  };

  var reset = function() {
    $(".page-elements").show();
    $("body, html").css("backgroundColor", "");

    $("#screencanvas, #processcanvas, #screen").width(cssWidth).height(cssHeight);
    $("#screen").css("position", "static");
    $("#screen").unbind("click", reset);
    $("#screen").click(enlarge);
    $(document).unbind("keyup", checkKeyNextPrevious);
    $(window).unbind("resize", updateScreenSize);
  }

  $("#screen").click(enlarge);
  
  
  /******************************************/
 
 (function() {

  var pointsL = [];

  return function() {
    quality(0.1);

    decay(0.5);

    for (var i = 0; i < 128; i++)
      pointsL[i] = [1 / 127 * i, 0.5 + soundData.waveDataL[i * 2] * 0.2];

    var h = ((time * 10) % 360) >> 0;

    drawPath(pointsL, false, null, "hsl(" + h + ",100%,15%)", 28);
    drawPath(pointsL, false, null, "hsl(" + h + ",100%,25%)", 20);

    quality(0.75, true);

    drawPath(pointsL, false, null, "white", 2);

    commit();

  };

})();
}


$(document).ready(init);