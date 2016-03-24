/* d3_coordinated_viz main.js */

//wrap everything in a self-executing anonymous function to move to local scope
(function(){
    
    //pseudo global variables
    var attArray = ["percentAfAm2010", "medianIncome2011", "wasteDensity2011", "petrochemDensity2014", "toxicsPP2010_2013"]; //list of attributes to be expressed
    var expressed = attArray[0]; //initial attribute

    //execute script when window is loaded
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = 800,
            height = 700;

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
            .scale(8600)
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

            //loop through the CSV to assign each set of CSV attribute values to geoJSON parish
            for (var i=0; i<csvData.length; i++){
                var csvParish = csvData[i]; //the current parish
                var csvKey = csvParish.GEOID; //the CSV primary key

                //loop through geoJSON to find correct parish
                for (var a=0; a<louisianaParishes.length; a++){
                    var geoProps = louisianaParishes[a].properties; //current geoJSON properties
                    var geoKey = geoProps.GEOID //geoJSON primary key

                    //where primary keys match, transfer CSV data to geoJSON properties objects
                    if (geoKey == csvKey){

                        //assign all attributes and values
                        attArray.forEach(function(attr){
                            var val = parseFloat(csvParish[attr]); //get CSV attribute value
                            geoProps[attr] = val; //assign attribute and value to geoJSON properties
                        });
                    };
                };
            };

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

            console.log(csvData);
            console.log(louisianaParishes);

        };  

    };
    
})();
