/* 575 boilerplate main.js */

//execute script when window is loaded
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //map frame dimensions
    var width = 700,
        height = 500;
    
    //svg container for map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //Albers equal area projection centered on Louisiana
    var projection = d3.geo.albers()
        .center([0, 31])
        .rotate([91.8, 0 , 0])
        .parallels([28, 34])
        .scale(6500)
        .translate([width/2, height/2]);
    
    var path = d3.geo.path()
        .projection(projection);
    
    //use queue.js to load data asynchronously in parallel
    var q = d3_queue.queue()
        q
		.defer(d3.csv, "data/d3_multivariate_data.csv") //load attributes from csv
        .defer(d3.json, "data/surrounding_states.topojson") //load surrounding states data
		.defer(d3.json, "data/louisiana_parishes.topojson") //load choropleth spatial data
		.await(callback);
        
    function callback(error, csvData, background, louisiana){
        //create graticule generator
        var graticule = d3.geo.graticule()
            .step([0.5, 0.5]); //place graticule lines every 5 degrees of longitude and latitude
        
        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule
        
        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
        
        //translate louisiana and background topoJSON
        var backgroundStates = topojson.feature(background, background.objects.surrounding_states)
            louisianaParishes = topojson.feature(louisiana, louisiana.objects.cb_2014_us_county_500k).features
        
        //add Louisiana parishes to the map
        var parishes = map.selectAll(".regions")
            .data(louisianaParishes)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "parishes " + d.properties.GEOID;
            })
            .attr("d", path);
        
        //add background states to the map
        var states = map.append("path")
            .datum(backgroundStates)
            .attr("class", "states")
            .attr("d", path);
    
    };  
    
};
