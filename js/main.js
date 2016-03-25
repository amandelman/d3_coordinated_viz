/* d3_coordinated_viz main.js */

//wrap everything in a self-executing anonymous function to move to local scope
(function(){
    
    //pseudo global variables
    var attArray = ["percentAfAm2010", "medianIncome2011", "wasteDensity2011", "petrochemDensity2014", "toxicsPP2010_2013"]; //list of attributes to be expressed
    var expressed = attArray[4]; //initial attribute

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
        
        //callback function to use data once loaded
        function callback(error, csvData, background, louisiana){    
            //place graticule
            setGraticule(map, path);
            
            //translate louisiana and background topoJSONs
            var backgroundStates = topojson.feature(background, background.objects.surrounding_states)
                louisianaParishes = topojson.feature(louisiana, louisiana.objects.cb_2014_us_county_500k).features
            
             //add background states to the map
            var states = map.append("path")
                .datum(backgroundStates)
                .attr("class", "states")
                .attr("d", path);
            
            //join CSV data to GeoJSON enumeration unites
            louisianaParishes = joinData(louisianaParishes, csvData);
            
            //create the color scale
            var colorScale = makeColorScale(csvData);
            
            //add enumeration units to the map
            setEnumerationUnits(louisianaParishes, map, path, colorScale);
        };
        
    }; //end of setMap()
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            '#f7f4f9',
            '#e7e1ef',
            '#d4b9da',
            '#c994c7',
            '#df65b0',
            '#e7298a',
            '#ce1256',
            '#91003f'
        ];
    
        
        //create color scale generator
    var colorScale = d3.scale.quantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute for a quantile scale
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
        
//        //create natural breaks color scale generator
//        var colorScale = d3.scale.threshold()
//            .range(colorClasses);
//        
//        //build array of all values of the expressed attribute
//        var domainArray = []
//        for (var i = 0; i<data.length; i++){
//            var val = parseFloat(data[i][expressed]);
//            domainArray.push(val);
//        };
//        
//        //cluster data using simple statistics clustering algorithm
//        var clusters = ss.ckmeans(domainArray, 5);
//        
//        console.log(clusters); 
//        
//        //reset domain array to cluster minima
//        domainArray = clusters.map(function(d){
//            return d3.min(d);
//        });
//        
//        //remove first value from domain array to create class breakpoints
//        domainArray.shift();
//        
//        //assign array of last 7 cluster minimums as domain
//        colorScale.domain(domainArray);
        
        return colorScale;
        
    };
    
    
    //function to create graticule
    function setGraticule(map, path){
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
    };
    
    //function to join CSV data to spatial data
    function joinData(louisianaParishes, csvData){
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
        
        return louisianaParishes;
    };
    
    //function to draw enumeration units
    function setEnumerationUnits(louisianaParishes, map, path,  colorScale){
        //add Louisiana parishes to the map
        var parishes = map.selectAll(".regions")
            .data(louisianaParishes)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "parishes " + d.properties.GEOID;
            })
            .attr("d", path)
            .style("fill", function(d){
                return colorScale(d.properties[expressed]);
            });
    };     

})();
