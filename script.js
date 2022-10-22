let canvas = document.getElementById("visualization");
let deadband_value_in  = document.getElementById("deadband_value_in");
let deadband_value_out = document.getElementById("deadband_value_out");
let context = canvas.getContext('2d');

let acquisitionRateInMS = 500;
let scrollSpeedInPX = 2;
let plotPoints = [];
let nowMilliseconds = 0;
let prvMilliseconds = 0;
let loopTime = 0;
let loopTimeSum = 0;
let resolution;
let lastX = 0;
let lastY = 0;
let newX;
let newY;
let deadband;
let failRect;
let deadband_width = 100;



// Treat a function as a JavaScript object
// as we want to have multiple instances
// representing multiple points.
function DrawPoint(x, y, ok) {

    // Initialize properties of the point.
    this.xCoordinate = x;
    this.yCoordinate = y;
    this.ok = ok;
    this.radius = 5;
    this.startAngle = 0;
    this.endAngle = 2 * Math.PI;
    this.alphaOpacity = 1.0;

    // Draw line path representing one point on the canvas.
    this.draw = function () {

        if (ok) {
            // Point falls outside the deadband and is drawn as a green circle.
            context.beginPath();
            context.arc(this.xCoordinate, this.yCoordinate, this.radius, this.startAngle, this.endAngle);
            
            context.strokeStyle = 'rgba(  0,   0,   0, ' + this.alphaOpacity + ' )';
            context.stroke();
            context.fillStyle   = 'rgba(  0, 255,   0, ' + this.alphaOpacity + ' )';
            context.fill();
        } else {
            // Point falls inside the deadband and is drawn as a red X.
            context.beginPath();
            context.moveTo(this.xCoordinate-5, this.yCoordinate+5);
            context.lineTo(this.xCoordinate+5, this.yCoordinate-5);
            context.moveTo(this.xCoordinate-5, this.yCoordinate-5);
            context.lineTo(this.xCoordinate+5, this.yCoordinate+5);
            context.strokeStyle = 'rgba( 255,   0,   0, ' + this.alphaOpacity + ' )';
            context.stroke();
        }

    }

    // First draw content and then decrease opacity to create fade-out effect.
    // TODO: Make the fade-out time dependent.
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
        return this.ok;
    }

}



function DrawDeadBand(y) {

    this.draw = function () {

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

    //console.log("interpolating");

    let firstPoint = true;

    this.draw = function () {
        //console.log("drawing");
        context.beginPath();
        // Go through array of points.
        for (var i = 0; i <= listOfPoints.length - 1; i++) {
            //console.log(i);
            // If the current plot point is valid, draw a point to it.
            if (Boolean(plotPoints[i].getOK())) {
                //console.log(Boolean(plotPoints[i].getOK));
                if (firstPoint) {
                    context.moveTo(Number(plotPoints[i].getX()), Number(plotPoints[i].getY()));
                    firstPoint = false;
                }
                else {
                    context.lineTo(Number(plotPoints[i].getX()), Number(plotPoints[i].getY()));
                }
            }
        }
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(   0,   255,   0, 0.33 )';
        context.stroke();
    }

    this.draw();

}



// Draw a transparent red rectangle over the scene
// that flashes shortly and then fades out.
function DrawFailRect() {

    this.alphaOpacity = 0.5;

    this.draw = function () {
        context.fillStyle   = 'rgba(255,   0,   0, ' + this.alphaOpacity + ')';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.update = function () {
        this.draw();
        this.alphaOpacity = this.alphaOpacity * 0.90;
        if (this.alphaOpacity < 0.001) { this.alphaOpacity = 0 };
    }

}



function drawCoordinateSystem() {

    context.lineWidth = 1;

    // Draw x-axis.
    context.beginPath();
    context.moveTo(100, 500);
    context.lineTo(900, 500);
    context.strokeStyle = 'rgba(   0,   0,   0, 1.0 )';
    context.stroke();

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

    // Logging the time between frames.
    prvMilliseconds = nowMilliseconds;
    nowMilliseconds = new Date().getMilliseconds();

    // Deal with overflow of the millisecond timer.
    if (nowMilliseconds < prvMilliseconds) {
        loopTime = 1000 + nowMilliseconds - prvMilliseconds;
    }
    else {
        loopTime = nowMilliseconds - prvMilliseconds;
    }

    loopTimeSum = loopTimeSum + loopTime;


    // Start animation via recursive call.
    requestAnimationFrame(animate);

    // Hard coded canvas size values for now...
    context.clearRect(0, 0, canvas.width, canvas.height);


    drawCoordinateSystem();


    // Add a new plot point every 1000 ms.
    if (loopTimeSum > acquisitionRateInMS) {
        //risingEdges.unshift(new DrawRisingEdge(canvas_waveform.width / 2 + accuracy * resolution));
        newX = canvas.width / 2 + 250;
        //console.log(newX);
        newY = canvas.height / 2 + (Math.random() - 0.5) * 250;
        //console.log(newY);
        //console.log(lastY);
        if ((newY > lastY + deadband_width/2) || (newY < lastY - deadband_width/2)) {
            plotPoints.unshift(new DrawPoint(newX, newY, true));
            deadband = new DrawDeadBand(newY, deadband_width);
            //Point outside deadband. Update last values.
            lastX = newX;
            lastY = newY;
        }
        else {
            // Indicate that a point fell into the deadband.
            plotPoints.unshift(new DrawPoint(newX, newY, false));
            failRect = new DrawFailRect();
        }
        loopTimeSum = 0;
        //console.log("New Point.")
    }

    // Go through the array of plot points and call their update method.
    for (var i = 0; i <= plotPoints.length - 1; i++) {
        plotPoints[i].update();
        // If a plot point has faded away, delete it from the array.
        if (plotPoints[i].getAlpha() <= 0) {
            plotPoints.pop();
        }
    }

    if (deadband) {
        deadband.update();
    }

    if (failRect) {
        failRect.update();
    }

    DrawInterpolation(plotPoints);

}

animate();