var psound = {};

psound.ui = function() {
  this.canvas = document.getElementById("screencanvas");
  this.context = this.canvas.getContext("2d");
  
  //this.context.fillStyle   = '#00CC00'; // set canvas background color
//this.context.fillRect  (0,   0, 350, 350);  // now fill the canvas

  this.centerx = this.canvas.width / 2;
  this.centery = this.canvas.height / 2;

  this.currentEndAngle = 0
  this.currentStartAngle = 0;
  
  //purple
  this.colorPrimary = '#7A378B';
  
  // cyan
  this.colorSecondary = "#0ff";

  this.paused = false;
}
//drawTri();
psound.ui.prototype = {
	
	drawPlay : function() {

  this.context.strokeStyle = this.colorSecondary;
  this.context.fillStyle = this.colorSecondary;

  // Set faux rounded corners
  this.context.lineJoin = "round";
  this.context.lineWidth = 20;

  // You can do the same thing with paths, like this triangle
  // Remember that a stroke will make the shape a bit larger so you'll need to fiddle with the
  // coordinates to get the correct dimensions.
  this.context.beginPath();
  this.context.moveTo(this.centerx - 20, this.centery - 40);
  this.context.lineTo(this.centerx + 60, this.centery);
  this.context.lineTo(this.centerx - 20, this.centery + 40);
  this.context.closePath();
  this.context.stroke();
  this.context.fill();

  this.context.beginPath();
  this.context.arc(this.centerx, this.centery, 200, 0, 360);
  this.context.lineWidth = 6;
  // line color

  this.context.stroke();

},

 drawPause : function() {


  this.context.strokeStyle = this.colorSecondary;
  this.context.fillStyle = this.colorSecondary;

  var offset = 65;
  // Set faux rounded corners
  this.context.lineJoin = "round";
  this.context.lineWidth = 20;

  var rectX = 50;
  var rectY = 50;
  var rectWidth = 35;
  var rectHeight = 120;
  var cornerRadius = 20;

  // You can do the same thing with paths, like this triangle
  // Remember that a stroke will make the shape a bit larger so you'll need to fiddle with the
  // coordinates to get the correct dimensions.
  this.context.strokeRect(this.centerx - (offset + rectWidth) / 2 + (this.context.lineWidth / 2), this.centery - rectHeight / 2 + (this.context.lineWidth / 2), rectWidth - cornerRadius, rectHeight - cornerRadius);
  this.context.fillRect(this.centerx - (offset + rectWidth) / 2 + (this.context.lineWidth / 2), this.centery - rectHeight / 2 + (this.context.lineWidth / 2), rectWidth - cornerRadius, rectHeight - cornerRadius);

  this.context.strokeRect(offset + this.centerx - (offset + rectWidth) / 2 + (this.context.lineWidth / 2), this.centery - rectHeight / 2 + (this.context.lineWidth / 2), rectWidth - cornerRadius, rectHeight - cornerRadius);
  this.context.fillRect(offset + this.centerx - (offset + rectWidth) / 2 + (this.context.lineWidth / 2), this.centery - rectHeight / 2 + (this.context.lineWidth / 2), rectWidth - cornerRadius, rectHeight - cornerRadius);

  this.context.beginPath();
  this.context.arc(this.centerx, this.centery, 200, 0, 360);
  this.context.lineWidth = 6;
  // line color

  this.context.stroke();

},

  draw : function() {/***************/
  if (true) {
    ui.drawPause();
  } else {
    ui.drawPlay();
  }

  ui.context.strokeStyle = ui.colorPrimary;
  ui.context.fillStyle = ui.colorPrimary;


  var radius = 220;

  var startAngle = ui.currentStartAngle * Math.PI;
  var endAngle = (ui.currentEndAngle) * Math.PI;

  ui.currentEndAngle = ui.currentEndAngle + 0.01;

  var counterClockwise = false;

  ui.context.beginPath();
  ui.context.arc(ui.centerx, ui.centery, radius, startAngle, endAngle, counterClockwise);
  ui.context.lineWidth = 12;
  //35;
  // line color

  ui.context.stroke();

  /************************************************/

}

}




/*****************************/
/*function clearDebug() {
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
}


$(document).ready(init);

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

*/