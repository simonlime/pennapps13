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
  this.colorSecondary = "#00c2f3";
  
  this.colorStack = ["#ba0000", "#ff8a00","#ead900","#00be00","#7A378B"];
  this.currentColor=5;

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

    var startAngle = (ui.currentStartAngle-.5) * Math.PI;
    var endAngle = (ui.currentEndAngle -.5) * Math.PI;

    ui.currentEndAngle = (ui.currentEndAngle + 0.01);

    var counterClockwise = false;

    ui.context.beginPath();
    ui.context.arc(ui.centerx, ui.centery, radius, startAngle, endAngle, counterClockwise);
    ui.context.lineWidth = 12;
    //35;
    // line color

    ui.context.stroke();

		function get_random_color() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
    
   
}

    if (ui.currentEndAngle >= 2.05) {
    	ui.colorPrimary =  ui.colorStack[ui.currentColor++ % ui.colorStack.length]; //ui.colorStack[Math.round(Math.random() * 5)];//get_random_color();
      ui.currentEndAngle = 0
      ui.currentStartAngle = 0;
    }
    /************************************************/

  }
}

/*****************************/

