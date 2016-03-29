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
        var width = window.innerWidth*0.5,
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
            .rotate([91.5, 0 , 0])
            .parallels([28, 34])
            .scale(8400)
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
            
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
        };
    }; //end of setMap()
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = ['#f7f4f9','#e7e1ef','#d4b9da','#c994c7','#df65b0','#e7298a','#ce1256','#980043','#67001f'];
    
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

        return colorScale;

    };
    
    //function to test for data value and return grey color if no data
    function testDataValue(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (val && val !=NaN){
            return colorScale(val);
        } else {
            return "CCC";
        };
    };
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth*0.425,
            chartHeight = 700;
        
        //create a second SVG element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
        
        //create a scale to size bars appropriately to frame
        var yScale = d3.scale.linear()
            .range([chartHeight, 0])
            .domain([0, 75]);
        
        //set bars for each Louisiana parish
        var bars = chart.selectAll("bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a,b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.GEOID;
            })
            .attr("width", chartWidth/csvData.length - 0.5)
            .attr("x", function (d, i){
                return i*(chartWidth/csvData.length)
            })
            .attr("height", function(d){
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed]));
            })
            .style("fill", function(d){
                return testDataValue(d, colorScale)
            });
        
        //annotate bars with attribute value text
        var numbers = chart.selectAll("numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a,b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.GEOID;
                console.log(d.GEOID);
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d,i){
                var fraction = chartWidth/csvData.length;
                return i * fraction + (fraction-1)/2;
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
            });
        
        //create text element for chart title
        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Percent African-American by Louisiana Parish, 2010");
        
        //create vertical axis generator
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left");

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(50, 0)")
            .call(yAxis);
        
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
                return testDataValue(d.properties, colorScale);
            });
    };     

})();
