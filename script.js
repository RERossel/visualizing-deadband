let canvas = document.getElementById("visualization");
let deadband_value_in  = document.getElementById("deadband_value_in");
let deadband_value_out = document.getElementById("deadband_value_out");
let context = canvas.getContext('2d');

let acquisitionRateMS = 500;
let scrollSpeedInPX = 2;
let plotPoints = [];
let currentTimeMS  = 0;
let previousTimeMS = 0;
let deltaTimeMS    = 0;
let timeBetweenAcquisitionsMS = 0;
let resolution;
let lastX = 0;
let lastY = 0;
let newX;
let newY;
let deadband;
let failRect;
let deadband_width = 100;



// Treat a function as a JavaScript object.
// We want to have multiple instances representing multiple points.
function DrawPoint(x, y, ok) {

    // Initialize properties of the point.
    this.xCoordinate = x;
    this.yCoordinate = y;
    this.outsideDeadBand = ok;
    this.radius = 5;
    this.startAngle = 0;
    this.endAngle = 2 * Math.PI;
    this.alphaOpacity = 1.0;

    // Draw line path representing one point on the canvas.
    this.draw = function () {

        if (this.outsideDeadBand) {

            // Point falls outside the deadband and is drawn as a green circle.
            context.beginPath();
            context.arc(this.xCoordinate, this.yCoordinate, this.radius, this.startAngle, this.endAngle);
            context.fillStyle   = 'rgba(  0, 255,   0, ' + this.alphaOpacity + ' )';
            context.fill();
            context.strokeStyle = 'rgba(  0,   0,   0, ' + this.alphaOpacity + ' )';
            context.lineWidth = 2;
            context.stroke();

        } else {

            // Point falls inside the deadband and is drawn as a red X.
            context.beginPath();
            context.moveTo(this.xCoordinate-5, this.yCoordinate+5);
            context.lineTo(this.xCoordinate+5, this.yCoordinate-5);
            context.moveTo(this.xCoordinate-5, this.yCoordinate-5);
            context.lineTo(this.xCoordinate+5, this.yCoordinate+5);
            context.strokeStyle = 'rgba( 255,   0,   0, ' + this.alphaOpacity + ' )';
            context.lineWidth = 2;
            context.stroke();

        }

    }

    // First draw content and then decrease opacity to create fade-out effect.
    // 🚧TODO🚧 Make this deltaTime dependent instead of frame-to-frame dependent.
    this.update = function () {
        this.draw();
        this.alphaOpacity = this.alphaOpacity * 0.99;
        if (this.alphaOpacity < 0.001) { this.alphaOpacity = 0 };
        this.xCoordinate = this.xCoordinate - scrollSpeedInPX;
    }

    // Getters for properties of this object.
    this.getAlpha = function () {
        return this.alphaOpacity;
    }
    this.getX = function () {
        return this.xCoordinate;
    }
    this.getY = function () {
        return this.yCoordinate;
    }
    this.getOK = function () {
        return this.outsideDeadBand;
    }

}



function DrawDeadBand(y) {

    this.draw = function () {

        context.lineWidth = 1;

        // Draw top border.
        context.beginPath();
        context.moveTo(100, y-(deadband_width/2));
        context.lineTo(900, y-(deadband_width/2));
        context.strokeStyle = 'rgba( 191, 191, 191, 1.0 )';
        context.stroke();
        
        // Draw bottom border.
        context.beginPath();
        context.moveTo(100, y+(deadband_width/2));
        context.lineTo(900, y+(deadband_width/2));
        context.strokeStyle = 'rgba( 191, 191, 191, 1.0 )';
        context.stroke();

        // Draw deadband shading zone.
        context.fillStyle   = 'rgba(191, 191, 191, 0.2)';
        context.fillRect(100, y-(deadband_width/2), 800, deadband_width);

    }

    this.update = function () {
        this.draw();
    }

}



function DrawInterpolation(listOfPoints) {

    context.lineWidth = 3;

    // Do not draw a line to the first point in the plot.
    let firstPoint = true;

    this.draw = function () {
        context.beginPath();
        // Go through array of points.
        for (var i = 0; i <= listOfPoints.length - 1; i++) {
            // If the current plot point is valid, draw a point to it.
            if (Boolean(plotPoints[i].getOK())) {
                if (firstPoint) {
                    // Move to the first point in the plot without drawing a line to it.
                    context.moveTo(Number(plotPoints[i].getX()), Number(plotPoints[i].getY()));
                    firstPoint = false;
                } else {
                    // Draw a line to each remaining plot point.
                    context.lineTo(Number(plotPoints[i].getX()), Number(plotPoints[i].getY()));
                }
            }
        }
        context.strokeStyle = 'rgba(   0,   255,   0, 0.33 )';
        context.stroke();
    }

    this.draw();

}



// Draw a transparent red rectangle over the scene.
// The rectangle should flash at half transparency and then fade out.
function DrawFailRect() {

    this.alphaOpacity = 0.5;

    // Overlay the whole scene with a transparent red rectangle to indicate point fell in deadband.
    this.draw = function () {
        context.fillStyle   = 'rgba(255,   0,   0, ' + this.alphaOpacity + ')';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Use the update method to create a fade-out effect for each draw call.
    this.update = function () {
        this.draw();
        // 🚧TODO🚧 Make this deltaTime dependent instead of frame-to-frame dependent.
        this.alphaOpacity = this.alphaOpacity * 0.90;
        if (this.alphaOpacity < 0.001) { this.alphaOpacity = 0 };
    }

}



function drawCoordinateSystem() {

    context.lineWidth = 4;
    //context.lineJoin = "round";

    // Draw x-axis.
    context.beginPath();
    context.moveTo(100, 500);
    context.lineTo(900, 500);
    context.strokeStyle = 'rgba(   0,   0,   0, 1.0 )';
    context.stroke();

    // Draw x-axis arrowhead.
    context.beginPath();
    context.moveTo(880, 495);
    context.lineTo(900, 500);
    context.lineTo(880, 505);
    context.closePath();
    context.fillStyle   = 'rgba(   0,   0,   0, 1.0 )';
    context.fill();
    context.strokeStyle = 'rgba(   0,   0,   0, 1.0 )';
    context.stroke();
    
    context.font = '24px serif';
    context.fillText('Time', 850, 530);


    // Draw y-axis.
    context.beginPath();
    context.moveTo(100, 500);
    context.lineTo(100, 100);
    context.strokeStyle = 'rgba(   0,   0,   0, 1.0 )';
    context.stroke();

    // Draw y-axis arrowhead.
    context.beginPath();
    context.moveTo( 95, 120);
    context.lineTo(100, 100);
    context.lineTo(105, 120);
    context.closePath();
    context.fillStyle   = 'rgba(   0,   0,   0, 1.0 )';
    context.fill();
    context.strokeStyle = 'rgba(   0,   0,   0, 1.0 )';
    context.stroke();

    context.font = '24px serif';
    context.fillText('Value', 30, 120);

}



// Read variable values from HTML slider(s) when we move them.
deadband_value_in.addEventListener('input', function () {
    read_deadband_value_in();
}, false);
// Perform slider function at least once when the script is executed for the first time.
read_deadband_value_in();

// This is the function to perform when the slider is moved.
function read_deadband_value_in() {
    deadband_width = Number(deadband_value_in.value);
    // Display the current slider values in the corresponding HTML elements.
    deadband_value_out.textContent = deadband_width;
}



// Main animation loop.
function animate() {


    // First, start with the 'engine' calculations.

    // Calculate time difference between frames as deltaTime.
    previousTimeMS = currentTimeMS;
    currentTimeMS = new Date().getMilliseconds();
    
    // Deal with overflow of the millisecond timer.
    if (currentTimeMS < previousTimeMS) {
        deltaTimeMS = 1000 + currentTimeMS - previousTimeMS;
    }
    else {
        deltaTimeMS = currentTimeMS - previousTimeMS;
    }
    
    // At 60 FPS, this value should be around 16 ms.
    //console.log("Loop time = " + deltaTimeMS);
    
    
    // Calculate time between acquisitions in deltaTime chunks.
    timeBetweenAcquisitionsMS = timeBetweenAcquisitionsMS + deltaTimeMS;
    
    // Add a new plot point every 1000 ms.
    if (timeBetweenAcquisitionsMS > acquisitionRateMS) {
        
        // The new x value should appear on the right quarter of the canvas width. 
        newX = 3 * ( canvas.width / 4);
        //console.log(newX);
        
        // The new y value should appear somewhere between the second and third quarter of the canvas height.
        newY = ( canvas.height / 2 ) + ( Math.random() - 0.5 ) * ( canvas.width / 4 );
        //console.log(newY);
        //console.log(lastY);
        
        // Check if the new point fell into the deadband or not.
        // Add point to the plot, indicating if it's outside (true) or inside (false) deadband.
        if ((newY > lastY + deadband_width/2) || (newY < lastY - deadband_width/2)) {
            plotPoints.unshift(new DrawPoint(newX, newY, true));
            deadband = new DrawDeadBand(newY, deadband_width);
            //Point outside deadband. Update last values.
            lastX = newX;
            lastY = newY;
        } else {
            // Indicate that a point fell into the deadband.
            plotPoints.unshift(new DrawPoint(newX, newY, false));
            failRect = new DrawFailRect();
        }
        // Reset acquisition timer after a new point has been drawn.
        timeBetweenAcquisitionsMS = 0;
        //console.log("New Point.")
    }


    // Calculations are done.
    // Start drawing the scene.
    
    // Clear the canvas before drawing the next frame.
    context.clearRect(0, 0, canvas.width, canvas.height);
    

    // Draw the deadband visualization first, as it should be in the background layer.
    if (deadband) {
        deadband.update();
    }
    

    // Draw the coordinate system as the second layer.
    drawCoordinateSystem();
    

    // Draw the plot pints as the third layer.
    // Go through the array of plot points and draw them calling their update method.
    for (var i = 0; i <= plotPoints.length - 1; i++) {
        plotPoints[i].update();
        // If a plot point has faded away, delete it from the array.
        if (plotPoints[i].getAlpha() <= 0) {
            plotPoints.pop();
        }
    }
    
    // Draw an interpolation line between the good (non-deadband) plot points.
    DrawInterpolation(plotPoints);
    

    // Draw the visualization of a point falling into the deadband as an overlay top layer.
    if (failRect) {
        failRect.update();
    }
    

    // Start next animation frame via recursive call to self.
    requestAnimationFrame(animate);
    

}

animate();