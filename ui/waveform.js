(function() {

var pointsL = [];

return function() {
    quality(0.1);

    decay(0.5);

    for (var i=0;i<128;i++)
      pointsL[i] = [ 1/127*i, 0.5 + soundData.waveDataL[i*2] * 0.2 ];

    var h = ((time * 10) % 360) >> 0;

    drawPath(pointsL, false, null, "hsl(" + h + ",100%,15%)", 28);
    drawPath(pointsL, false, null, "hsl(" + h + ",100%,25%)", 20);

    quality(0.75, true);

    drawPath(pointsL, false, null, "white", 2);

    commit();

};

})();