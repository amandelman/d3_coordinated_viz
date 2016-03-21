/* 575 boilerplate main.js */

//execute script when window is loaded
window.onload = setMap();

//set up choropleth map
function setMap(){
    
    //use queue.js to load data asynchronously in parallel
    var q = d3_queue.queue()
    q
		.defer(d3.csv, "data/d3_multivariate_data.csv") //load attributes from csv
		.defer(d3.json, "data/louisiana_parishes.topojson") //load choropleth spatial data
		.await(callback);
        
        
    function callback(error, csvData, louisiana){
        
        //translate louisiana topoJSON
        var louisianaParishes = topojson.feature(louisiana, louisiana.objects.cb_2014_us_county_500k)
        console.log(louisianaParishes);
        
        
    };  
    
};
