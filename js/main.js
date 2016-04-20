/* d3_coordinated_viz main.js */

//wrap everything in a self-executing anonymous function to move to local scope
(function(){
    
    //pseudo global variables
    var attCsvArray = ["petrochemDensity2014", "toxicsPP2010_2013", "releases_per_facility_2014", "wasteDensity2011",  "percentAfAm2010", "percent_poverty_2008"]; //list of attributes to be expressed
    
    var displayArray = ["Petrochemical Facilities", "Toxic Materials Emitted", "Toxic Releases per Facility", "Hazardous Waste Facilities", "African-American Population", "Percent in Poverty"]
    
    var expressed = attCsvArray[0]; //initial attribute
    
    //chart frame dimensions
    var chartWidth = window.innerWidth*0.46,
        chartHeight = 406,
        leftPadding = 35,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    //create a scale to size bars appropriately to frame and for axis
    var yScale = d3.scale.linear()
        .range([chartHeight-10, 0])
        .domain([0, 0.085]);


    //execute script when window is loaded
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth*0.48,
            height = 670;

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
            .scale(width*12.5)
            .translate([width/2, height/2]);

        var path = d3.geo.path()
            .projection(projection);

        //use queue.js to load data asynchronously in parallel
        var q = d3_queue.queue()
            q
            .defer(d3.csv, "data/d3_multivariate_data.csv") //load attributes from csv
            .defer(d3.json, "data/states-merged.topojson") //load surrounding states data
            .defer(d3.json, "data/louisiana_parishes_fixed.topojson") //load choropleth spatial data
            .await(callback);
        
        //callback function to use data once loaded
        function callback(error, csvData, background, louisiana){    
            //place graticule
            setGraticule(map, path);
            
            //translate louisiana and background topoJSONs
            var backgroundStates = topojson.feature(background, background.objects.merged)
                louisianaParishes = topojson.feature(louisiana, louisiana.objects.louisiana_parishes_fixed).features
            
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
            setChart(csvData, colorScale, louisianaParishes);
            
            createDropdown(csvData);
        
        };
    }; //end of setMap()
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses =      ['#f1eef6','#d4b9da','#c994c7','#df65b0','#dd1c77','#980043'];
    
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
            return "#d3d3d3";
        };
    };
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        //create a second SVG element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight + 10)
            .attr("class", "chart");
        
        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        //set bars for each Louisiana parish
        var bars = chart.selectAll("bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a,b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar p" + d.GEOID;
            })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
        
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //create vertical axis generator
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left");

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
        
        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        updateChart(bars, csvData.length, colorScale, yScale);
        
    }; //end of setChart
    
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
                    attCsvArray.forEach(function(attr){
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
        var parishes = map.selectAll(".parishes")
            .data(louisianaParishes)
            .enter()
        
            .append("path")
            .attr("class", function(d){
                return "parishes p" + d.properties.GEOID;
            })
            .attr("d", path)
            .style("fill", function(d){
                return testDataValue(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
        
        var desc = parishes.append("desc")
            .text('{"stroke": "rgba(0, 0, 0, 0.7)", "stroke-width": "0.2px", "stroke-linecap": "round"}');
    };     

    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            })
        
        //add initial option
        var initialOption = dropdown.append("option")
            .attr("class", "initialOption")
            .attr("disabled", "true")
            .text("Select Attribute");
        
        //dropdown options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attCsvArray)
            .enter()
            .append("option")
            .attr("value", function(d){return d})
            .text(function(d, i){return displayArray[i]});        
    };
    
    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;
        
        //recreate the color scale
        var colorScale = makeColorScale(csvData);
        
        //recolor enumeration units
        var parishes = d3.selectAll(".parishes")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return testDataValue(d.properties, colorScale);
            });
        
        //rescale chart
        if (attribute == "percent_poverty_2008"){
            var yScale = d3.scale.linear()
            .range([chartHeight-10, 0])
            .domain([0, 48]);
            
        } else if (attribute == "wasteDensity2011") {
            var yScale = d3.scale.linear()
            .range([chartHeight-10, 0])
            .domain([0, 0.35]);
            
        } else if (attribute == "petrochemDensity2014") {
            var yScale = d3.scale.linear()
            .range([chartHeight-10, 0])
            .domain([0, 0.085]);
            
        } else if (attribute == "toxicsPP2010_2013") {
            var yScale = d3.scale.linear()
            .range([chartHeight-10, 0])
            .domain([0, 435]);
        
        } else if (attribute == "releases_per_facility_2014") {
            var yScale = d3.scale.linear()
            .range([chartHeight-10, 0])
            .domain([0, 29]);
            
        } else {
            var yScale = d3.scale.linear()
            .range([chartHeight-10, 0])
            .domain([0, 75]);
            
        };
        
        //re-sort bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a,b){
                return b[expressed]-a[expressed]
            })
            .transition()
            .delay(function(d,i){
                return i * 20
            })
            .duration(500);
        
        updateChart(bars, csvData.length, colorScale, yScale);
   
    };//end changeAttribute
    
    function updateChart(bars, n, colorScale, yScale){
        //count number of zeroes and set a variable equal to that total
        var currentAttTotal = 0;
        
        bars.each(function(d,i) {
            if(d[expressed] != 0) {
                currentAttTotal++;
            }
        });

        n = currentAttTotal;
        
        //position bars
        bars.attr("x", function (d, i){
            console.log(d[expressed])
                return i*(chartInnerWidth/n) + leftPadding;
            })
        //size/resize bars
            .attr("height", function(d, i){
                return chartHeight - yScale(parseFloat(d[expressed]))
            })  
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed])) - topBottomPadding;
            })
             
        //color/recolor bars, remove bars with a value of 0, re-set bar width to account for removed bars
            .style("fill", function(d){
                return testDataValue(d, colorScale)
            })
            .attr("width", function (d, i){
                if (d[expressed] == 0){
                    return 0;
                    } else {return chartInnerWidth/n - 0.5;}
                })    
            .style('display', function(d){
                if(d[expressed] == 0) {
                    return 'none'
                }
            });
        
        
        //recreate y axis
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left");
        
        //place axis
        var axis = d3.selectAll("g.axis")
            .call(yAxis);
        
        //update title to reflect variable selected from dropdown
        if (expressed == "percent_poverty_2008"){
            var updatedTitle = "Percent of Population in Poverty, 2008"
            
            } else if (expressed == "wasteDensity2011") {
                
            var updatedTitle = "Hazardous Waste Facilities per Parish Square Mile, 2011"
            
            } else if (expressed == "petrochemDensity2014") {
                
            var updatedTitle = "Petrochemical Facilities per Parish Square Mile, 2014"
            
            } else if (expressed == "toxicsPP2010_2013") {
                
            var updatedTitle = "Pounds of Toxic Substances Releases per Person, 2010-2013"
            
            } else if (expressed == "releases_per_facility_2014") {
                
            var updatedTitle = "Toxic Releases per Facility by Parish, 2014"
            } else {
                
            var updatedTitle = "Percent African-American Population by Parish, 2010"
            }
        
        var chartTitle = d3.select(".chartTitle")
            .text(updatedTitle);
        
          d3.select('.subheader').html(updatedTitle)
        
    };//end updateChart
     
    //highlight
    function highlight(props){
        //change stroke
        var selected = d3.selectAll(".p" + props.GEOID)
        .style("stroke", "#000000")
        .style("stroke-width", "2")
        
        setLabel(props);
    };
    
    //dehighlight
    function dehighlight(props){
        var selected = d3.selectAll(".p" + props.GEOID)
            .style({
                "stroke": function(){
                    return getStyle(this, "stroke")
                },
                "stroke-width": function(){
                    return getStyle(this, "stroke-width")
                }
            });
        
        function getStyle(element, styleName){
            var styleText = d3.select(element)
            .select("desc")
            .text();
            
            var styleObject = JSON.parse(styleText);
            
            return styleObject[styleName];
        };
        
        d3.select(".infolabel")
            .remove();
    };
    
    //set dynamic label
    function setLabel(props){
        //label content
        
        //Update title on label depending on selected variable
        if (expressed == "percent_poverty_2008"){
            var updatedTitle = "Percent in Poverty, 2008"
            
            } else if (expressed == "wasteDensity2011") {
                
            var updatedTitle = "Hazardous Waste Facilities per Square Mile in 2011"
            
            } else if (expressed == "petrochemDensity2014") {
                
            var updatedTitle = "Petrochemical Facilities per Square Mile in 2014"
            
            } else if (expressed == "toxicsPP2010_2013") {
                
            var updatedTitle = "Pounds of Toxic Substances Released per Person, 2010-2013"
            
            } else if (expressed == "releases_per_facility_2014") {
                
            var updatedTitle = "Toxic Releases per Facility in 2014"
            } else {
                
            var updatedTitle = "Percent African-American in 2010"
            }
        
        //Make 0 values display as "No Data" to avoid NaNs
        var cleanseLabel = function(ex) {
            if(ex === 0) {
                return "No Data"
            } else {
                return ex
            }
        }       
        
        //create label text
        var labelAttribute = "<h2>" + cleanseLabel(props[expressed]) + "</h2><br><h3>" + updatedTitle + "</h3>";
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr({
                "class": "infolabel",
                "id": props.GEOID + "_label"
            })
            .html(labelAttribute);
                
        var parishName = infolabel.append("div")
            .attr("class", "labelname")
            .html("Parish: " + props.NAME);
    };
    
    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
        
        //use coordinates of mousemove event to set label locations
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;
        
        //horizontal label coordinate, testing overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing overflow
        var y = d3.event.clientY < 75 ? y2 : y1;
        
        d3.select(".infolabel")
            .style({
            "left": x + "px",
            "top": y + "px"
        });
    };
    
})();
