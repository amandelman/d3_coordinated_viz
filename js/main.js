/* 575 boilerplate main.js */

//execute script when window is loaded
window.onload = function(){   
    
    var w = 1000, h = 600; //set width and height variables
    
    //container block
    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //add an svg to the body
        .attr("width", w) //add a width for the svg using variable w
        .attr("height", h) //add a height for the svg using variable h
        .attr("class", "container"); //declare a class for the container
    
    //new rectangle block
    var rectangle = container.append("rect") //append a rectangle svg to the container
        .datum(500) //declare a datum
        .attr("width", function(d) { //set a width calculated from the datum
            return ((d*2)-100);   
        })
        .attr("height", function(d){ //set a height calculated from the datum
            return d;    
        })
        .attr("class", "rectangle"); //declare a class for the rect svg
    
    //city population array  
    var cityPop = [
        {
            city: 'Byron Bay, Australia',
            population: 4959
        },
        { 
            city: 'Madison, WI',
            population: 233209
        },
        {
            city: 'Port Vila, Vanuatu',
            population: 44040
        },
        {
            city: 'San Francisco, CA',
            population: 852469
        }
    ];
    
    //find minimum value of populations in the array
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });
    
    //find maximum value of populations in the array
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });
    
    //color scale generator
    var color = d3.scale.linear()
        .range([
            "#5df0d4",
            "#d9d101"
        ])
        .domain([
            minPop,
            maxPop
        ]);
    
    //create a scale generator for y coordinate
    var y = d3.scale.linear()
        .range([550, 50])
        .domain([0, 1000000]);
    
    //create a scale generator for stroke weight
    var weight = d3.scale.linear()
        .range([1, 5])
        .domain([
            minPop,
            maxPop
        ]);
    
    //create a scale generator for x coordinates
    var x = d3.scale.linear()
        .range([90, 750])//output minimum and maximum
        .domain([0,3])//input minimum and maximum
    
        console.log(x);
    
    //new circles
    var circles = container.selectAll(".circles")//create an empty selection
        .data(cityPop)//link data
        .enter()//bind data
        .append("circle")//add a circle for each datum in the array
        .attr("class", "circles")//define a class for each circle
        .attr("id", function(d){//create ids for each circle
              return d.city;
              })
        .attr("r", function(d){//calculate a radius for each circle based on population
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){//calculate x coordinates for each circle center using the x scale generator
            return x(i);
        })
        .attr("cy", function(d){//calculate y coordinates for each circle center based on y scale generator
            return y(d.population);
        })
        .style("fill", function(d, i){//add a fill based on color scale generator
          return color(d.population);  
        })
        .style("stroke", "#000")//add a stroke
        .style("stroke-width", function(d){//set a stroke width based on size of circles
            return weight(d.population);
        })
    
    //create y axis generator
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    
    //create axis g element and add axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(60, 0)")
        .call(yAxis);
    
    //create a text element and add title
    var title = container.append("text")//append text element to svg
        .attr("class", "title")//define a class
        .attr("text-anchor", "middle")//position text within text element
        .attr("x", 500)//x coordinate of text element on svg
        .attr("y", 33)//y coordinate of text element on svg
        .text("City Populations");//print text to text element
    
    //create circle labels
    var labels = container.selectAll("labels")//create an empty selection
        .data(cityPop)//link data
        .enter()//bind data
        .append("text")//add text element to selection
        .attr("class", "labels")//define a labels class
        .attr("text-anchor", "left")//position text within each text element
        .attr("y", function(d){
            //vertical position center on each circle
            return y(d.population) - 20;
        });
    
    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d, i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population*0.01/Math.PI) + 5;
        })
        .text(function(d){
              return d.city;
              });
    
    //create format generator
    var format = d3.format(",");    
    
    //second line of label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d, i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population*0.01/Math.PI) + 5;
        })
        .attr("dy", "15")//vertical offset for second line
        .text(function(d){
            return "Pop. " + format(d.population);//use format generator to add commas
        });
}