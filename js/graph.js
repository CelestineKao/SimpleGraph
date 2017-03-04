//bar graph, network graph

/*jshint esversion: 6 */
var ORIGIN = new THREE.Vector3(0, 0, 0);
var X_AXIS = new THREE.Vector3(1, 0, 0);
var Y_AXIS = new THREE.Vector3(0, 1, 0);
var Z_AXIS = new THREE.Vector3(0, 0, 1);
var GRAPH = {"graph_type":"", "3D":true, "axes_attr":[], "scale_log": true, "axes_range":[], "axes_labels":[]};


/**
 * Calculates and returns approrpiately scaled value
 *@param {Dictionary} range - range dictionary
 *@param {Number} number
 *@return {Number} - scaled number
 */
function calculateScaledNumber(range, number) {

    //Constrains the axes to 0-100
    var min_axis_val = 0;
    var max_axis_value = 100;

    //Range max and min
    var range_min = Math.log(range.minimum);
    var range_max = Math.log(range.maximum);

    //Calculate scale_factor
    var scale_factor = (range_max - range_min) / (max_axis_value);

    return (Math.log(number) - range_min) / scale_factor;
}

/**
 * Draws a line given the endpoints and a material.
 *@param {Vector3} point1
 *@param {Vector3} point2
 *@param {Material} material
 */
function drawLine(point1, point2, material) {
    var line_geometry = new THREE.Geometry();
    line_geometry.vertices.push(point1, point2);
    var line = new THREE.Line(line_geometry, material);
    scene.add(line);
}

/**
 * TODO Let user choose scale, and min/max of axis
 * Draws the axis and their labels. Also returns axis endpoint.
 *@param {Number} axis - 0:x, 1:y, 2:z
 *@param {String} label
 *@param {Number[]} range
 */
function drawAxis(axis, range) {

    //First rescale the range, if needed
    var axis_max = range.maximum;
    if (axis_max > 100) { //Values from 0-100 remain the same
        axis_max = calculateScaledNumber(range, range.maximum);
    }

    //Round up to integer value for usability
    axis_max = Math.ceil(axis_max);

    //var origin = new THREE.Vector3(0,0,0);
    if (axis === 0) { //x-axis
        drawLine(ORIGIN, new THREE.Vector3(axis_max, 0, 0), axisMaterial);
    } else if (axis === 1) { //y-axis
        drawLine(ORIGIN, new THREE.Vector3(0, axis_max, 0), axisMaterial);
    } else { //z-axis
        drawLine(ORIGIN, new THREE.Vector3(0, 0, axis_max), axisMaterial);
    }
    return axis_max;
}

/**
 * Postion label for readability on x-axis
 *@param {Mesh} mesh - label mesh
 *@param {Numer} position
 */
function positionXLabel(mesh, position) {
    var x_dimension = mesh.geometry.boundingBox.getSize().x;
    mesh.position.set(position - x_dimension, 0, -5);
    return mesh;
}

/**
 * Postion label for readability on y-axis
 *@param {Mesh} mesh - label mesh
 *@param {Numer} position
 */
function positionYLabel(mesh, position) {
    //Rotate over z-axis
    mesh.rotateOnAxis(Z_AXIS, -Math.PI / 2);
    mesh.position.set(0, position, -5);
    return mesh;
}

/**
 * Postion label for readability on z-axis
 *@param {Mesh} mesh - label mesh
 *@param {Numer} position
 */
function positionZLabel(mesh, position) {
    //Rotate on y-axis
    mesh.rotateOnAxis(Y_AXIS, Math.PI / 2);
    mesh.position.set(-5, 0, position);
    return mesh;
}

/**
 * Draws the text label at a specified position on a given axis
 *@param {Number} position
 *@param {String} label
 *@param {Vector3} axis
 */
function drawLabel(position, label, axis) {

    //Setup the text and font.
    var fontLoader = new THREE.FontLoader();
    fontLoader.load(font_url, function(text_label) {
        var text_geometry = new THREE.TextGeometry(label, {
            size: 5,
            height: 0.5,
            curveSegments: 6,
            font: text_label,
        });

        text_geometry.computeBoundingBox();
        var axis_label = new THREE.Mesh(text_geometry, textMaterial);

        if (axis === 0) {
            axis_label = positionXLabel(axis_label, position);
        } else if (axis === 1) {
            axis_label = positionYLabel(axis_label, position);
        } else {
            axis_label = positionZLabel(axis_label, position);
        }
        scene.add(axis_label);
    });

}

/**
 * Plots the points by grabbing object values and mapping to x,y,z.
 *@param {Dictionary} data_set
 *@param {String[]} attributes
 */
function findAndPlotPoints(data_set, attributes) {

    var point = [0, 0, 0];
    for (var object in data_set) {
        for (i = 0; i < attributes.length; i += 1) {
            var value = getAttributeValue(data_set, object, attributes[i]);
            if (value instanceof Array) {
                value = value.length;
            }
            //Scale number
            if(value == -1){
                continue;
            }
            if(value > 100){
                //console.log(value);
                value = calculateScaledNumber(getAttributeRange(data_set, attributes[i]), value);
            }
            if (i === 0) {
                point[0] = value;
            } else if (i === 1) {
                point[1] = value;
            } else {
                point[2] = value;
            }
        }
        //console.log(point);
        var point_geometry = new THREE.SphereGeometry(1.0);
        var pointMaterial = new THREE.MeshLambertMaterial({color: 0x20b2aa, transparent:true, opacity:0.8});
        var data_point = new THREE.Mesh(point_geometry, pointMaterial);

        var point_name = getAttributeValue(data_set, object, "json_class").concat(":", getAttributeValue(data_set, object, "name"));
        data_point.name = point_name;
        data_point.position.set(point[0], point[1], point[2]);
        //console.log(data_point);
        scene.add(data_point);
    }
}

//TODO let user decide radius, informative color
/**
 * Make a scatter plot given the x_axis, y_axis, and z_axis labels
 *@param {String} type - "Actor" or "Movie"
 *@param {String[]} axes - x-axis, y_axis, and z_axis labels.
 */
function scatterPlot(type, axes) {

    //Determine which data set we're pulling from.
    var data_set = data[0];
    if (type == "Movie") {
        data_set = data[1];
    }

    //Setup the axes and labels.
    var axis_end_points = [0, 0, 0]; //Should contain at least 2 points.
    for (var i = 0; i < axes.length; i += 1) {
        var range = getAttributeRange(data_set, axes[i]);
        axis_end_points[i] = drawAxis(i, range); //Stored axis endpoints for positioning of labels and camera.
        drawLabel(axis_end_points[i], axes[i], i);
    }

    findAndPlotPoints(data_set, axes);

    //Position camera
    /*camera_pos = new THREE.Vector3(axis_end_points[0]*1.8 , axis_end_points[1]*0.75, axis_end_points[2]*1.8 );
    setCamera();*/

}

function drawGraph(){
    console.log("GRPAH TIME");
    //Grab data from form and store
    var graph_type = $( "#graph_select" ).val();
    console.log(graph_type);
    var x_axis_data = $("#x_axis_select").val();
    console.log(x_axis_data);
    var y_axis_data = $("#y_axis_select").val();
    console.log(y_axis_data);
    var z_axis_data = $("#z_axis_select").val();
    console.log(z_axis_data);


}
