// CANVAS SIZE
var width = $('#container').width(),
height = 400;

// GRAPH SIZE
var graphHeight = 95;
var graphChangeHeight = 100;

// MAP SIZE
var mapScale = 145;

// OFFSET POSITION ON CANVAS
var mapOffsetX = 10;
var mapOffsetY = 20;
var changeGraphYOffset = -33;
var yAxisPadding = 33;
var totalGraphYOffset = -10;

// COLORS
var hoverColor = "lightblue";
var normalColor = "lightgrey";
var disabledColor = "lightgrey";
var selectedCountryColor = "white";
var asylumColor = "#465F7F";
var originColor = "#74879F";
var graphUpColor = "#F26E80";
var graphDownColor = "#338EC9";
var graphUpStrokeColor = "#F26E80";
var graphDownStrokeColor = "#3DC5B1";

var type="ASY";

// COLOR BREWER - TOTAL ASYLUM
var colorTotalASY = d3.scale.threshold()
  .domain([0, 25000, 100000, 500000, 1000000, 2500000, 7000000])
  .range(['#D1D7DF','#A3AFBF','#74879F','#465F7F','#18375F','#122947']);

// COLOR BREWER - TOTAL ORIGIN
var colorTotalORI = d3.scale.threshold()
  .domain([0, 25000, 100000, 500000, 1000000, 2500000, 7000000])
  .range(['#D1D7DF','#A3AFBF','#74879F','#465F7F','#18375F','#122947']);

// COLOR BREWER - CHANGE ASYLUM
var colorChangeASY = d3.scale.threshold()
  .domain([-2000000, -500000, -100000, -1000, -1, 0, 1, 1000, 100000, 500000, 7000000])
  .range(['#EF4A60','#B33848','#F26E80','#F592A0','#F592A0','#F592A0','grey','#99C7E4','#66AAD7','#338EC9','#0072BC']);

// COLOR BREWER - CHANGE ORIGIN
var colorChangeORI = d3.scale.threshold()
  .domain([0, 10000, 50000, 100000, 250000, 500000, 1000000, 3000000, 7000000])
  .range(colorbrewer.RdYlGn[9]);

// OTHER VARIABLES

var minYear = 1951;
var maxYear = 2016;
var totalYears = maxYear - minYear;
var selectedYear = maxYear;
var MaxTotal = 17838074;
var mapFixedWidth = 960;
var graphSelectedBar = 0;
var countrySelected = 0;
var totalOrGraph = 0; // 0 = total, 1 = change graphs
var countryHovered = 0;
var countrySelectedName;
var barSpacing = 3;
var ratio = 0.4;
var width = $('#map').width();

// DETECT MOBILE 

function detectmob() {
  if(window.innerWidth <= 700 || window.innerHeight <= 600) {
    return true;
  } else {
    return false;
  }
}

if(detectmob()){
  barSpacing = 1;
}

// PROJECTION AND SCALE

var projection = d3.geo.robinson()
  .center([0, 0])
  .scale(mapScale)
  .translate([mapFixedWidth/2 + mapOffsetX, height/2 + mapOffsetY]);

var path = d3.geo.path()
  .projection(projection);

// CREATE SVGS
// map svg
var canvas = d3.select("#map").append("svg")
    .attr("width", "100%")
    // .attr("height", width*ratio)
    .attr("viewBox", "0 0 " + mapFixedWidth + " " + (mapFixedWidth*ratio))
    // .attr("preserveAspectRatio", "xMinYMin")
    // .style("position", "absolute")
    // .style("top", "0px");

// total chart svg
var totalChart = d3.select('.totalGraphDiv').append("svg")
    .attr("width", "100%") // Add 6px to show latest year label.
    .attr("viewBox", "0 0 "+width+" 120")


// change chart svg
var changeChart = d3.select('.changeGraphDiv').append("svg")
    .attr("width", "100%") // Add 6px to show latest year label.
    .attr("viewBox", "0 0 "+width+" 120")

width = width - 10;

// ZOOM FUNCTION
function redraw() {
  canvas.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}


// ADD MAP GEOMETRY
d3.json("js/worldtopo.json", function(error, map) {

  // The following change applies 2012 boundaries
  // up until the maximum year present in the data.
  // This should be fine, as no major boundaries have changed
  // between 2012 and 2017.
  map.objects.world.geometries.forEach(function (geometry){
    if(geometry.properties.COWEYEAR === 2012){
      geometry.properties.COWEYEAR = maxYear;
    }
  });

  // MAP SVG GROUP
  var mapsvg = canvas.append("g")
    .attr("class","map");

  // MAP BACKGROUND LAYER -- clickable to capture mouse off events
  var mapbg = mapsvg
    .append("rect")
    .attr("class","mapbglayer")
    .attr("width",width-yAxisPadding)
    .attr('height', 470)
    .attr("y", 0)
    .attr("x", yAxisPadding)
    .attr("fill", "rgba(0,0,0,0.0)")
    .on("click",function(d,i){

      $('.mapbglayer').css('cursor', 'default');

      $('#countrySelectorMobile select').val(0);

      countrySelectedName = "";
      $('#countryBox').text("World");

      var yAxis = d3.svg.axis()
        .scale(scaleYTotalAxis)
        .orient("left")
        .ticks(4)
        .tickFormat(function (d) {
          var label;
          if(d==0){
            label = 0;
          }
          if ((d / 100) >= 1) {
            label = d;
          }
          if ((d / 1000) >= 1) {
            label = d / 1000 + "k";
          }
          if ((d / 1000000) >= 1) {
            label = d / 1000000 + "m";
          }
          return label;
        });

      //Create Y axis
      totalChart.selectAll(".totalYAxis")
        .transition().duration(1000).call(yAxis);

      var type = $('#type').val();
      var countryCode = "Total";
      var max = d3.max(dataset.map(function(d) {return d[type][0][countryCode];} ));
      var maxChange = d3.max(dataset.map(function(d,i) {if(i>=1){return Math.abs(dataset[i][type][0][countryCode]-dataset[i-1][type][0][countryCode]);}} ));

      var scaleYTotalCountry = d3.scale.linear()
        .domain([0,max])
        .range([0,graphHeight-10]);

      var scaleYChangeCountry = d3.scale.linear()
        .domain([0,maxChange])
        .range([0,graphHeight/2-10]);

      countrySelected = 0;
      changeType();

      totalChart.selectAll(".graphTotal rect")
        .data(dataset)
        .transition()
        .duration(700)
        .attr('height', function(d,i){
          var type = $('#type').val();
          return scaleYTotalCountry(d[type][0][countryCode]);
        })
        .attr("y", function(d,i){
          var type = $('#type').val();
          return graphHeight-scaleYTotalCountry(d[type][0][countryCode]);
        });
    });

  var map_data = topojson.feature(map, map.objects[Object.keys(map.objects)[0]]).features;

  // //BACKGROUND MAP
  mapsvg.append("g").attr("class","map_bg")
  .selectAll(".country_bg")
  .data(map_data)
  .enter().append("path")
  .attr('class', 'country_bg')
  .attr('d', path)
  .style("fill",disabledColor)
  .style("z-index", "1");
  
  // ACTIVE COUNTRY MAP
  mapsvg.append("g").attr("class","countrymap")
    .selectAll(".country")
    .data(map_data)
    .enter().append("path")
    .attr("class", function(d) { return "country " + d.id; })
    .attr("d", path)
    // .attr("filter", "url(#innershadow2)")
    .style("z-index", "10")
    .on("click", function(d){
      d3.select(this).transition().style("fill", selectedCountryColor);
      mapMouseClick(d);
      changeType();
    })
    .on("mouseover", function(d){
      mapMouseOver(d);
    })
    .on("mouseout", function(d){
      mapMouseOut(d);
      d3.select(this).attr("filter", "");
    });

  var countrySelect = d3.select('#countrySelectorMobile').append('select');

  countrySelect.append('option').text('World').attr('value', 0);

  var countries = map.objects.world.geometries;

  // DISPUTED BOUNDARIES
  d3.json("js/disputed_boundaries.json", function(error, disputed_boundaries) {
    d3.json("js/disputed_boundaries_polygons.json", function(error, disputed_boundaries_polygons) {

      var data = topojson.feature(disputed_boundaries_polygons, disputed_boundaries_polygons.objects[Object.keys(disputed_boundaries_polygons.objects)[0]]).features;

      var disputedBoundariesPolygons = mapsvg.selectAll('.disputed_boundaries_polygons')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'disputed_boundary')
      .append("path")
      .attr("class", 'disputed_boundaries_polygons')
      .attr("d", path)
      .attr("id", function(d) {return d.id;})
      .style('fill-opacity', 1)
      .style('fill', disabledColor)
      .style('stroke', 'black')
      .style('stroke-width', 0.2)
      .style('stroke-opacity', 1)
      .style('stroke-dasharray', '2,1');

      var data = topojson.feature(disputed_boundaries, disputed_boundaries.objects[Object.keys(disputed_boundaries.objects)[0]]).features;

      var disputedBoundaries1 = mapsvg.selectAll('.disputed_boundaries1')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'disputed_boundary')
      .append("path")
      .attr("class", 'disputed_boundaries1')
      .attr("d", path)
      .attr("id", function(d) {return d.id;})
      .style('fill-opacity', 0)
      .style('stroke', 'lightgrey')
      .style('stroke-width', 0.2)
      .style('stroke-opacity', 1);

      var disputedBoundaries2 = mapsvg.selectAll('.disputed_boundaries2')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'disputed_boundary')
      .append("path")
      .attr("class", 'disputed_boundaries2')
      .attr("d", path)
      .attr("id", function(d) {return d.id;})
      .style('fill-opacity', 0)
      .style('stroke', 'black')
      .style('stroke-width', 0.2)
      .style('stroke-opacity', 1)
      .style('stroke-dasharray', '2,1');

    });
  });


  // invoke d3 click
  jQuery.fn.d3Click = function () {
    this.each(function (i, e) {
      var evt = new MouseEvent("click");
      e.dispatchEvent(evt);
    });
  };

  countrySelect.on('change', function(d){
    var v = $(this).val();
    if(v!=0){
     var opt = d3.select('option[value='+v+']')[0][0];
      var data = opt.__data__;
      mapMouseClick(data);
    } else {
      mapbg.on('click')();
    }
    changeType();
  });

  //**************************
  // country select dropdown next/prev buttons
  //**************************
  $("#next, #prev").click(function() {
    $("#countrySelector select :selected")[this.id]().prop("selected", true);
      var v = $("#countrySelector select").val();
      if(v!=0){
        var opt = d3.select('option[value='+v+']')[0][0];
        var data = opt.__data__;
        mapMouseClick(data);
      } else {
        mapbg.on('click')();
      }
      changeType();
  });

  countrySelect.selectAll('option')
    .data(countries.filter(function(d){
      return d.properties.COWEYEAR == 2016 && d.properties.CNTRY_NAME != 'Taiwan' && d.properties.CNTRY_NAME != 'Kosovo' && d.properties.CNTRY_NAME != 'Western Sahara'
    }))
    .enter()
    .append('option')
    .text(function(d){
      return d.properties.CNTRY_NAME
    })
    .attr('value', function(d){
      return d.properties.ISO1AL3
    });


  // order country dropdown
  var sel = $('#countrySelectorMobile select');
  var selected = sel.val(); // cache selected value, before reordering
  var opts_list = sel.find('option');
  opts_list.sort(function(a, b) { return $(a).text() > $(b).text() ? 1 : -1; });
  sel.html('').append(opts_list);
  sel.val(selected); // set cached selected value

  var barWidth = (width-yAxisPadding)/dataset.length;

  var scaleYTotal = d3.scale.linear()
    .domain([0,20000000])
    .range([0,graphHeight]);

  var scaleYTotalAxis = d3.scale.linear()
    .domain([0,20000000])
    .range([graphHeight-10, 0]);

  var scaleYChange = d3.scale.linear()
    .domain([0,2663045])
    .range([0,graphHeight/2-10]);

  var scaleYChangeAxis = d3.scale.linear()
    .domain([-2664045,2664045])
    .range([graphHeight-20, 0]);

  // TOTAL BAR GRAPH SVG GROUP
  var graphTotal = totalChart.append("g")
    .attr("class","graphTotal");

  // ADD TOTAL GRAPH BARS
  graphTotal
    .selectAll("rect")
    .attr('class','totalBars')
    .data(dataset)
    .enter()
    .append("rect")
    .attr("width",barWidth-barSpacing)
    .attr('height', function(d,i){var type = $('#type').val(); return scaleYTotal(d[type][0].Total)})
    .attr("y", function(d,i){var type = $('#type').val(); return graphHeight-scaleYTotal(d[type][0].Total)+totalGraphYOffset+9})
    .attr("x", function(d,i){return yAxisPadding+(i)*barWidth+2;})
    .attr("fill", asylumColor)
    .on("mouseover", function(d){
      if(graphSelectedBar==0){
        totalOrGraph = 0;
        selectedYear = d.year;
        sliderTotal(selectedYear);
        yearOver(selectedYear);
      }
      if(timer) {
        clearTimeout(timer);
        timer = null
      }
    });
  // .style("stroke",function(){return "rgba(124,255,255,0.5)";})
  // .style("stroke-width", 1);

  // TOTAL BAR GRAPH OVERLAY - slide function
  var graphTotalOverlay = totalChart.append("g")
    .attr("class","graphOverlay");

  var timer;

  graphTotalOverlay
    .selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("width",barWidth+1)
    .attr("class",function(d){return "overlayBar graphTotalOverlay_"+d.year})
    .attr('height', graphHeight+36)
    .attr("y", totalGraphYOffset+18)
    .attr("x", function(d,i){return yAxisPadding+(i)*barWidth;})
    .attr("fill", "rgba(0,0,0,0.05)")
    .style("z-index", 50)
    .on("mouseover", function(d){
      if(graphSelectedBar==0){
        totalOrGraph = 0;
        selectedYear = d.year;
        sliderTotal(selectedYear);
        yearOver(selectedYear);
      }
      if(timer) {
        clearTimeout(timer);
        timer = null
      }
    })
    .on("mouseout", function(d){
      if(graphSelectedBar == 0){
        selectedYear = d.year;

        if(timer) {
          clearTimeout(timer);
          timer = null;
        }

        if(!detectmob()){
          timer = setTimeout(function() {resetYear();}, 500);
        }

        if(selectedYear!=maxYear){
          yearOut(selectedYear);
        }
      }
    })
    .on("click", function(d){
      if(graphSelectedBar==0){
        graphSelectedBar=1
        selectedYear = d.year;
        sliderTotal(selectedYear);
        totalOrGraph = 0;
      } else {
        graphSelectedBar=0;

        d3.selectAll(".y"+selectedYear).attr("fill", "#000").style("font-size", "8px");

        d3.selectAll(".yearLabels")
          .attr("fill", "#9B9B9B")
          .style("font-size", "6px")
          .style("font-weight", "normal");

        selectedYear = d.year;
        sliderTotal(selectedYear);
        yearOver(selectedYear);
      }
    });

  // TOTAL BAR GRAPH Y AXIS

  //Define Y axis
  var yAxis = d3.svg.axis()
    .scale(scaleYTotalAxis)
    .orient("left")
    .ticks(4)
    .tickFormat(function (d) {
      var label;
      if(d==0){label = 0}

      if ((d / 100) >= 1) {
        label = d;
      }
      if ((d / 1000) >= 1) {
        label = d / 1000 + " K";
      }
      if ((d / 1000000) >= 1) {
        label = d / 1000000 + "m";
      }
      return label;
    });

  //Create Y axis
  totalChart.append("g")
      .attr("class", "totalYAxis")
      .attr("transform", "translate(" + yAxisPadding + ",9)")
      .call(yAxis);

  // CHANGE BAR GRAPH SVG GROUP
  var graphChangeDecreases = changeChart.append("g")
      .attr("class","graphChange graphChangeDecreases");

  // ADD CHANGE GRAPH BARS
  graphChangeDecreases
    .selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
      .attr("width",barWidth-barSpacing)
      .attr('height', function(d,i){ return scaleYChange(Math.abs(d[type][0].Decreases));  })
      .attr("y", 50)
      .attr("x", function(d,i){return yAxisPadding+(i*barWidth)+3;})
      .attr("fill", function(d,i){return graphDownColor;});

  // CHANGE BAR GRAPH SVG GROUP
  var graphChangeIncreases = changeChart.append("g")
      .attr("class","graphChange graphChangeIncreases");

  // ADD CHANGE GRAPH BARS
  graphChangeIncreases
    .selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
      .attr("width",barWidth-barSpacing)
      .attr('height', function(d,i){ return scaleYChange(Math.abs(d[type][0].Increases));  })
      .attr("y", function(d,i){
        return 50-scaleYChange(Math.abs(d[type][0].Increases));;
      })
      .attr("x", function(d,i){return yAxisPadding+(i*barWidth)+3;})
      .attr("fill", function(d,i){return graphUpColor;});

  // CHANGE BAR GRAPH OVERLAY - slide function
  var graphChangeOverlay = changeChart.append("g")
      .attr("class","graphOverlay");

  // CHANGE BAR GRAPH - MIDDLE AXIS
  graphChangeOverlay
    .append("line")
      .attr("x1", 0)
      .attr("x2",width-15)
      .attr("y1", 0)
      .attr("y2", 0);

  graphChangeOverlay
    .selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
      .attr("class",function(d){return "overlayBar graphChangeOverlay_"+d.year})
      .attr("width",barWidth)
      .attr('height', graphChangeHeight+7)
      .attr("y", changeGraphYOffset+32)
      .attr("x", function(d,i){return yAxisPadding+(i*barWidth)+2;})
      .attr("fill", "rgba(0,0,0,0.05)")
      .style("z-index", 50)
      .on("mouseover", function(d){
        if(graphSelectedBar==0){

          changeChart.selectAll(".graphTotalOverlay_" + maxYear).attr("filter", "null");
          changeChart.selectAll(".graphTotalOverlay_" + maxYear).attr("fill", "rgba(20,20,30,0.04)");
          changeChart.selectAll(".graphChangeOverlay_" + maxYear).attr("filter", "null");
          changeChart.selectAll(".graphChangeOverlay_" + maxYear).attr("fill", "rgba(20,20,30,0.04)");

          selectedYear = d.year;
          sliderChange(selectedYear);
          totalOrGraph = 1;

          yearOver(selectedYear);

          if(selectedYear!=maxYear){
            d3.selectAll(".y"+maxYear)
                .attr("fill", "#9B9B9B")
                // .style("font-size", "6px")
                .style("font-weight", "normal");
            totalChart.selectAll(".graphTotalOverlay_" + maxYear).attr("filter", "null");
            totalChart.selectAll(".graphTotalOverlay_" + maxYear).attr("fill", "rgba(20,20,30,0.04)");
          }
        }
        if(timer) {
          clearTimeout(timer);
          timer = null
        }
      })
      .on("mouseout", function(d){
        if(graphSelectedBar==0){
          selectedYear = d.year;
          yearOut(selectedYear);
          if(timer) {clearTimeout(timer); timer = null;};
          if(!detectmob()){
            timer = setTimeout(function() {resetYear();}, 500);
          }
        }
      })
      .on("click", function(d){
        if(graphSelectedBar==0){
          totalOrGraph = 1;
          graphSelectedBar=1
          selectedYear = d.year;
          sliderChange(selectedYear);
        } else {

          graphSelectedBar=0;

          d3.selectAll(".yearLabels").transition()
            .duration(300)
              .attr("fill", "#9B9B9B")
              .style("font-size", "6px")
              .style("font-weight", "normal");
          selectedYear = d.year;
          sliderChange(selectedYear);
          yearOver(selectedYear);
        }
      });

  // CHANGE BAR GRAPH Y AXIS

  //Define Y axis
  var yAxisChange = d3.svg.axis()
    .scale(scaleYChangeAxis)
    .orient("left")
    .ticks(0)
    .tickFormat(function (d) {
      var label;
      var label;
      if(d==0){label = 0}
      if ((d / 100) >= 1) {
        label = d;
      }
      if ((d / 1000) >= 1) {
        label = d / 1000 + " K";
      }
      if ((d / 1000000) >= 1) {
        label = d / 1000000 + "m";
      }

      return d;
    });

  // Create Y axis
  // canvas.append("g")
  //   .attr("class", "axis")
  //   .attr("transform", "translate(" + yAxisPadding + ",165)")
  //  .call(yAxisChange);

  // TOTAL CHART YEAR LABELS
  totalChart.selectAll(".yearLabels")
    .data(dataset)
    .enter().append("text")
      .attr("class",function (d,i){return "yearLabels y"+d.year})
      // .attr("x", function(d,i){return +0+(i)*barWidth;})
      .attr("x", function(d,i){ return 6+yAxisPadding+(i)*barWidth+2;})
      .attr("y", 107)
      .attr("dx", 0) // padding-right
      .attr("dy", "0") // vertical-align: middle
      .attr("text-anchor", "middle") // text-align: right
      .style("font-size", "7px")
      .attr("fill", "#9B9B9B")
      .text(function(d,i){
        var y = d.year.toString();
        return "'"+y.substring(2);
      });

  selectedYear = maxYear;
  sliderTotal(selectedYear);
  yearOver(selectedYear);

  $('#type').val("ASY");
  changeType();
});


function yearOver(selectedYear){

    d3.selectAll('.disputed_boundary').attr('opacity', function(d){
      if(selectedYear>=d.properties.startyear){
        return 1;
      } else {
        return 0;
      }
    });

  // // only show disputed boundaries on latest year
  // if(selectedYear==maxYear){
  //   d3.selectAll('.disputed_boundary').attr('opacity', function(d){

  //   });
  // } else {
  //   // d3.selectAll('.disputed_boundary').attr('opacity', 0);
  // }

  d3.selectAll(".yearLabels")
    .attr("y", 107)
    .attr("fill", "#9B9B9B")
    .style("font-size", "7px")
    .style("font-weight", "normal");

  d3.selectAll(".y"+selectedYear)
    .attr("y", 108)
    .attr("fill", "#000")
    .style("font-size", "9px")
    .style("font-weight", "bold");
  // .text(function(d,i){
  //     return d.year;
  //   });

  d3.selectAll('.overlayBar').style('opacity', 0);
  d3.selectAll('.graphTotalOverlay_'+selectedYear).style('opacity', 1);
  d3.selectAll('.graphChangeOverlay_'+selectedYear).style('opacity', 1);
}

function yearOut(selectedYear){
  d3.selectAll(".y"+selectedYear)
    .attr("y", 107)
    .attr("fill", "#9B9B9B")
    .style("font-size", "7px")
    .style("font-weight", "normal")
    .text(function(d,i){
      var y = d.year.toString();
      return "'"+y.substring(2);
    });
}

// MOUSE OVER COUNTRY
function mapMouseOver(d){
  var year = selectedYear-minYear;
  var type = $('#type').val();
  var countryCode = d.id;
  var countryName = d.properties.CNTRY_NAME;
  countryHovered = d.id;

  var refASYTotal = (dataset[year].ASY[0][countryCode]);
  if(refASYTotal>0){refASYTotal = numberWithCommas(refASYTotal)}else{refASYTotal="n/a"};
  if(year>0){var refASYChange = (dataset[year].ASY[0][countryCode]-dataset[year-1].ASY[0][countryCode]);} else { var refASYChange = "n/a";}
  if (refASYChange>0){refASYChange = numberWithCommas(Math.abs(refASYChange)); $('#refASYChangeIcon').attr("class","changeSmallUp"); $('#refASYChangeYear').text(" increase since "+(selectedYear-1));};
  if (refASYChange<0){refASYChange = numberWithCommas(Math.abs(refASYChange)); $('#refASYChangeIcon').attr("class","changeSmallDown"); $('#refASYChangeYear').text(" decrease since "+(selectedYear-1));};
  if (refASYChange==0){refASYChange = "n/a"; $('#refASYChangeIcon').attr("class","changeSmallNone"); $('#refASYChangeYear').text(" no change since "+(selectedYear-1))};

  $('#Country').text(countryName);
  $('#refASYTitle').text("Refugees in "+countryName);
  $('#refASYTotal').text(refASYTotal);
  $('#refASYChange').text(refASYChange);

  var refORITotal = (dataset[year].ORI[0][countryCode]);
  if(refORITotal>0){refORITotal = numberWithCommas(refORITotal)}else{refORITotal="n/a"};
  if(year>0){var refORIChange = (dataset[year].ORI[0][countryCode]-dataset[year-1].ORI[0][countryCode]);} else { var refORIChange = "n/a";}
  if (refORIChange>0){refORIChange = numberWithCommas(Math.abs(refORIChange)); $('#refORIChangeIcon').attr("class","changeSmallUp"); $('#refORIChangeYear').text(" increase since "+(selectedYear-1));};
  if (refORIChange<0){refORIChange = numberWithCommas(Math.abs(refORIChange)); $('#refORIChangeIcon').attr("class","changeSmallDown"); $('#refORIChangeYear').text(" decrease since "+(selectedYear-1));};
  if (refORIChange==0){refORIChange = "n/a"; $('#refORIChangeIcon').attr("class","changeSmallNone"); $('#refORIChangeYear').text(" no change since "+(selectedYear-1))};

  $('#refORITitle').html("Refugees from "+countryName);
  $('#refORITotal').text(refORITotal);
  $('#refORIChange').text(refORIChange);

  $('#thisYear').text(selectedYear);
  if(dataset[year][type][0][countryCode]){var populationAsylum = numberWithCommas(dataset[year].ASY[0][countryCode])}else{var populationAsylum = "n/a"};
  $('#map_tooltip').html();
  $('#map_tooltip').text(d.properties.CNTRY_NAME);
  $('#map_tooltip').css("display","inline");

  // $('#map_info').html("<span style='font-size: 10px; font-weight: normal;'>Number of Refugees <b>from</b> "+d.properties.CNTRY_NAME+":</span><span style='font-size: 12px; font-weight: normal;'>"+(populationAsylum)+"</span>");

  $('#mapinfo_text').css("display","block");
}

// MOUSE OUT COUNTRY
function mapMouseOut(d){
  countryHovered = 0;
  $('#map_tooltip').css("display","none");
}

// MOUSE CLICK COUNTRY
function mapMouseClick(d){

  var type = $('#type').val();
  var countryCode = d.properties.ISO1AL3;
  $('#countryBox').text(d.properties.CNTRY_NAME);

  $('#countrySelectorMobile select').val(countryCode);

  $('.mapbglayer').css('cursor', 'pointer');

  countrySelectedName = d.properties.CNTRY_NAME;

  var max = d3.max(dataset.map(function(d) {return d[type][0][countryCode];} ));
  var maxChange = d3.max(dataset.map(function(d,i) {if(i>=1){return Math.abs(dataset[i][type][0][countryCode]-dataset[i-1][type][0][countryCode]);}} ));
  var scaleYTotalCountry = d3.scale.linear()
    .domain([0,max])
    .range([0,graphHeight-10]);

  var scaleYChangeCountry = d3.scale.linear()
    .domain([0,maxChange])
    .range([0,graphHeight/2-10]);

  var scaleYTotalAxis = d3.scale.linear()
    .domain([0,max])
    .range([graphHeight-10, 0]);

  //Define Y axis
  var yAxis = d3.svg.axis()
    .scale(scaleYTotalAxis)
    .orient("left")
    .ticks(4)
    .tickFormat(function (d) {
      var label;
      if(d==0){label = 0}

      if ((d / 100) >= 1) {
        label = d;
      }
      if ((d / 1000) >= 1) {
        label = d / 1000 + "k";
      }
      if ((d / 1000000) >= 1) {
        label = d / 1000000 + "m";
      }
      return label;
    });

  //Create Y axis
  totalChart.selectAll(".totalYAxis")
    .transition().duration(1000).call(yAxis);

  // update total chart
  totalChart.selectAll(".graphTotal rect")
    .data(dataset)
    .transition()
      .attr('height', function(d,i){var type = $('#type').val(); return scaleYTotalCountry(d[type][0][countryCode])})
      .attr("y", function(d,i){var type = $('#type').val(); return graphHeight-scaleYTotalCountry(d[type][0][countryCode])})

  changeChart.selectAll(".graphChangeIncreases rect")
    .data(dataset)
    .transition()
    .duration(700)
      .attr('height', function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);
        return scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));  }
      })
      .attr("y", function(d,i){
        var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);}
        var change = (d[type][0][countryCode])-prevValue;
        var changeAbs;
        if(change>=0){changeAbs=1;}else{changeAbs=-1};
        var height = scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));
        if(changeAbs==1){return 77-height+changeGraphYOffset+5;}; // if a positive value
        if(changeAbs==-1){return 79+changeGraphYOffset+5;}; // if a positive value
      })
      .attr("fill", function(d,i){
        var type = $('#type').val();
        if(i>=1){
          prevValue=(dataset[i-1][type][0][countryCode]);
        } if(((d[type][0][countryCode])-prevValue)>=0){
          return graphUpColor;
        }
        else{
          return graphDownColor;
        }
      });
  countrySelected = countryCode;

  changeChart.selectAll(".graphChangeDecreases rect")
    .data(dataset)
    .transition()
    .duration(700)
      .attr('height', function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);
        return scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));  }
      })
      .attr("y", function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);}
        var change = (d[type][0][countryCode])-prevValue;
        var changeAbs;
        if(change>=0){changeAbs=1;}else{changeAbs=-1};
        var height = scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));
        if(changeAbs==1){return 77-height+changeGraphYOffset+5;}; // if a positive value
        if(changeAbs==-1){return 79+changeGraphYOffset+5;}; // if a positive value
      })
      .attr("fill", function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);} if(((d[type][0][countryCode])-prevValue)>=0){return graphUpColor;}
        else{return graphDownColor;}
      });

  countrySelected = countryCode;
}

function yearUp(){
  if(selectedYear<maxYear){
    graphSelectedBar = 1;
    yearOver(selectedYear+1);
    yearOut(selectedYear);
    selectedYear = selectedYear + 1;
    changeType();
  }
}

function yearDown(){
  if(selectedYear>minYear){
    graphSelectedBar = 1;
    yearOver(selectedYear-1);
    yearOut(selectedYear);
    selectedYear = selectedYear - 1;
    changeType();
  }
}

function resetYear() {
  selectedYear = maxYear;
  yearOver(maxYear);
  if(totalOrGraph==1){
    sliderChange(maxYear);
  } else {
    sliderTotal(maxYear);
  }
}

// SLIDER TOTAL FUNCTION
function sliderTotal(year){
  var year = selectedYear-minYear;
  var type = $('#type').val();

  sliderAll(selectedYear);
  canvas.selectAll(".country")
      .style("display", "block")
    .filter(function(d) { return (d.properties.COWSYEAR > selectedYear)||(d.properties.COWEYEAR + 1 <= selectedYear)})        // <== This line
      .style("display", "none");

  if(type=="ASY"){
    $('#totalASYkey').css('display',"block");
    $('#totalORIkey').css('display',"none");
    $('#changekey').css('display',"none");

    var state = d3.selectAll('.country')
    .style('fill', function(d){
      var countryCode = d.id;
      var result1 = dataset[year][type][0][countryCode];

      if(countryCode!=countrySelected){
        if((result1==0)||(!result1)){return "lightgrey" }else { return colorTotalASY(result1)};
      } else {
        return selectedCountryColor;
      }

    });
  }

  if(type=="ORI"){
    $('#totalASYkey').css('display',"none");
    $('#totalORIkey').css('display',"block");
    $('#changekey').css('display',"none");

    var state = d3.selectAll('.country')
    .style('fill', function(d){
      var countryCode = d.id;
      var result1 = dataset[year][type][0][countryCode];


      if(countryCode!=countrySelected){
        if(result1==0){return "lightgrey";}else { return colorTotalORI(result1);};
      } else { return selectedCountryColor;}

    });
  }
}

canvas.append("text").text(maxYear);

function sliderActiveYear(year){
  var activeYear = year + minYear;
}

// SLIDER CHANGE FUNCTION
function sliderChange(year){
  var year = selectedYear-minYear;
  var type = $('#type').val();
  sliderAll(selectedYear);
  sliderActiveYear(year);

  canvas.selectAll(".country")
    .style("display","block")
    .filter(function(d) { return (d.properties.COWSYEAR > selectedYear)||(d.properties.COWEYEAR +1 <= selectedYear)})        // <== This line
    .style("display", "none");

  $('#totalASYkey').css('display',"none");
  $('#totalORIkey').css('display',"none");
  $('#changekey').css('display',"block");

  if(type=="ASY"){
    var state = d3.selectAll('.country').style('fill', function(d,i){
      var countryCode = d.id;
      var result = dataset[year][type][0][countryCode] - dataset[year-1][type][0][countryCode];
      if(countryCode!=countrySelected){
        if(result==0){return "lightgrey"}else { return colorChangeASY(-result);}
      } else {
        return selectedCountryColor;
      }
    });
  }

  if(type=="ORI"){
    var state = d3.selectAll('.country').style('fill', function(d){
      var countryCode = d.id;
      var result = dataset[year][type][0][countryCode] - dataset[year-1][type][0][countryCode];
      if(countryCode!=countrySelected){
        if(result==0){
          return "lightgrey";
        } else {
          return colorChangeASY(-result);
        }
      } else {
        return selectedCountryColor;
      }
    });
  }
}

// SLIDER ALL FUNCTION
function sliderAll(year){
  var year = selectedYear-minYear;
  var type = $('#type').val();
  if(countrySelected!=0){var q = countrySelected} else {var q = "Total";};

  var totalValue = numberWithCommas(dataset[year][type][0][q]);
  if(totalValue == 0){totalValue = "n/a"};

  if(selectedYear==maxYear){$("#yearUp").css("opacity", "0.2");}else{$("#yearUp").css("opacity", "1");};
  if(selectedYear==minYear){$("#yearDown").css("opacity", "0.2");}else{$("#yearDown").css("opacity", "1");};

  if(q=="Total"){
    if(year>0){
      var increases = (dataset[year][type][0]["Increases"]);
      var decreases = (dataset[year][type][0]["Decreases"]);
    } else {
      var decreases = "n/a";var increases = "n/a";
    }

    increases = numberWithCommas(Math.abs(increases));
    if(increases == 0){increases = "n/a"}

    decreases = numberWithCommas(Math.abs(decreases));
    if(decreases == 0){decreases = "n/a"}

    if(selectedYear>minYear){$('#increaseValue').text(increases);}else{$('#increaseValue').text("n/a");}
    if(selectedYear>minYear){$('#decreaseValue').text(decreases);}else{$('#decreaseValue').text("n/a");}
  }

  else {

    if(year>0){
      var increases = (dataset[year][type][0]["Increases"]);
      var decreases = (dataset[year][type][0]["Decreases"]);
    }else{
      var decreases = "n/a";var increases = "n/a";
    };

    var changeValue = dataset[year][type][0][q]-dataset[year-1][type][0][q];

    if (changeValue < 0){
      if(selectedYear>minYear){$('#decreaseValue').text(numberWithCommas(Math.abs(changeValue))); $('#increaseValue').text("n/a");}else{$('#decreaseValue').text("n/a");$('#increaseValue').text("n/a");}
    }

    if (changeValue > 0){
      if(selectedYear>minYear){$('#increaseValue').text(numberWithCommas(Math.abs(changeValue))); $('#decreaseValue').text("n/a");}else{$('#increaseValue').text("n/a");$('#decreaseValue').text("n/a");}
    }

    if(changeValue == 0){
      $('#increaseValue').text("n/a");
      $('#decreaseValue').text("n/a");
    }

  }

  $('#totalValue').text(totalValue);

  $('#yearBox').text(selectedYear);

  var year = selectedYear-minYear;
  var type = $('#type').val();
  var countryCode = countrySelected;
  var countryName = countrySelectedName;

  if(countrySelected==0){ countryName = 'No Country Selected'; $('#mapinfo_text').css("display","none");} else {$('#mapinfo_text').css("display","block");};

  var refASYTotal = (dataset[year].ASY[0][countryCode]);
  if (refASYTotal>0){refASYTotal = numberWithCommas(refASYTotal)}else{refASYTotal="n/a"};
  if (year>0){var refASYChange = (dataset[year].ASY[0][countryCode]-dataset[year-1].ASY[0][countryCode]);} else { var refASYChange = "n/a";}
  if (refASYChange>0){refASYChange = numberWithCommas(Math.abs(refASYChange)); $('#refASYChangeIcon').attr("class","changeSmallUp"); $('#refASYChangeYear').text(" increase since "+(selectedYear-1));};
  if (refASYChange<0){refASYChange = numberWithCommas(Math.abs(refASYChange)); $('#refASYChangeIcon').attr("class","changeSmallDown"); $('#refASYChangeYear').text(" decrease since "+(selectedYear-1));};
  if (refASYChange==0){refASYChange = "n/a"; $('#refASYChangeIcon').attr("class","changeSmallNone"); $('#refASYChangeYear').text(" no change since "+(selectedYear-1))};

  $('#Country').text(countryName);
  $('#refASYTitle').text("Refugees in "+countryName);
  $('#refASYTotal').text(refASYTotal);
  $('#refASYChange').text(refASYChange);

  var refORITotal = (dataset[year].ORI[0][countryCode]);
  if (refORITotal>0){refORITotal = numberWithCommas(refORITotal)}else{refORITotal="n/a"};
  if (year>0){var refORIChange = (dataset[year].ORI[0][countryCode]-dataset[year-1].ORI[0][countryCode]);} else { var refORIChange = "n/a";}
  if (refORIChange>0){refORIChange = numberWithCommas(Math.abs(refORIChange)); $('#refORIChangeIcon').attr("class","changeSmallUp"); $('#refORIChangeYear').text(" increase since "+(selectedYear-1));};
  if (refORIChange<0){refORIChange = numberWithCommas(Math.abs(refORIChange)); $('#refORIChangeIcon').attr("class","changeSmallDown"); $('#refORIChangeYear').text(" decrease since "+(selectedYear-1));};
  if (refORIChange==0){refORIChange = "n/a"; $('#refORIChangeIcon').attr("class","changeSmallNone"); $('#refORIChangeYear').text(" no change since "+(selectedYear-1))};

  $('#refORITitle').html("Refugees from "+countryName);
  $('#refORITotal').text(refORITotal);
  $('#refORIChange').text(refORIChange);
}

function switchChange() {

  var getwidth = 0;
  var getx =0;
  var dur = 0;

  var graphTotal = d3.select('svg .graphTotal');

  if($('#type').val()=="ORI") {

    graphTotal.selectAll(".graphTotal rect")
        .attr("width", function(){getwidth = Number(d3.select(this).attr("width")); return 0});

    graphTotal.selectAll(".graphTotal rect").transition()
      .duration(200)
        .attr("fill", asylumColor);

    graphTotal.selectAll(".graphTotal rect")
        .attr("width", getwidth);

    $('#type').val("ASY");
    $('#switch').attr("class","switchASY");
    $('#switchORI').attr("class","switchInactive");
    $('#switchASY').attr("class","switchActive");

  } else {
    graphTotal.selectAll(".graphTotal rect")
        .attr("width", function(){getwidth = Number(d3.select(this).attr("width")); return 0});

    graphTotal.selectAll(".graphTotal rect").transition()
      .duration(200)
        .attr("fill", originColor);

    graphTotal.selectAll(".graphTotal rect")
      .attr("width", getwidth);

    graphTotal.selectAll(".graphTotal rect");

    $('#type').val("ORI");
    $('#switch').attr("class","switchORI");
    $('#switchORI').attr("class","switchActive");
    $('#switchASY').attr("class","switchInactive");
  }
  changeType();
}

function changeType(handler){

  var graphTotal = d3.select('svg .graphTotal');

  if(totalOrGraph==1){sliderChange(selectedYear, handler)}else{sliderTotal(selectedYear, handler)};

  var type = $('#type').val();
  if(countrySelected!=0){
    var countryCode = countrySelected;
    var max = d3.max(dataset.map(function(d) {return d[type][0][countryCode];} ));
    var maxChange = d3.max(dataset.map(function(d,i) {if(i>=1){return Math.abs(dataset[i][type][0][countryCode]-dataset[i-1][type][0][countryCode]);}} ));
    var scaleYTotalCountry = d3.scale.linear()
      .domain([0,max])
      .range([0,graphHeight-10]);

    graphTotal
      .selectAll("rect")
      .transition()
      .duration(700)
        .attr('height', function(d,i){var type = $('#type').val(); return scaleYTotalCountry(d[type][0][countryCode])})
        .attr("y", function(d,i){var type = $('#type').val(); return graphHeight-scaleYTotalCountry(d[type][0][countryCode])+totalGraphYOffset+9})

    var scaleYTotalCountry = d3.scale.linear()
      .domain([0,max])
      .range([0,graphHeight-10]);

    var scaleYChangeCountry = d3.scale.linear()
      .domain([0,maxChange])
      .range([0,graphHeight/2-10]);

    var scaleYTotalAxis = d3.scale.linear()
      .domain([0,max])
      .range([graphHeight-10, 0]);

    //Define Y axis
    var yAxis = d3.svg.axis()
      .scale(scaleYTotalAxis)
      .orient("left")
      .ticks(4)
      .tickFormat(function (d) {
        var label;
        if(d==0){label = 0}

        if ((d / 100) >= 1) {
          label = d;
        }
        if ((d / 1000) >= 1) {
          label = d / 1000 + "k";
        }
        if ((d / 1000000) >= 1) {
          label = d / 1000000 + "m";
        }
        return label;
      });

    //Create Y axis
    totalChart.selectAll(".totalYAxis")
      .transition().duration(1000).call(yAxis);

    changeChart.selectAll(".graphChangeIncreases rect")
      .data(dataset)
      .transition()
      .duration(700)
        .attr('height', function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);
          return scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));  }
        })
        .attr("y", function(d,i){
          var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);}
          var change = (d[type][0][countryCode])-prevValue;
          var changeAbs;
          if(change>=0){changeAbs=1;}else{changeAbs=-1};
          var height = scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));
          if(changeAbs==1){return 77-height+changeGraphYOffset+5;}; // if a positive value
          if(changeAbs==-1){return 79+changeGraphYOffset+5;}; // if a positive value
        })
        .attr("fill", function(d,i){
          var type = $('#type').val();
          if(i>=1){
            prevValue=(dataset[i-1][type][0][countryCode]);
          }
          if(((d[type][0][countryCode])-prevValue)>=0){
            return graphUpColor;
          } else {
            return graphDownColor;
          }
        });
    countrySelected = countryCode;

    changeChart.selectAll(".graphChangeDecreases rect")
      .data(dataset)
      .transition()
      .duration(700)
        .attr('height', function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);
          return scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));  }
        })
        .attr("y", function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);}
          var change = (d[type][0][countryCode])-prevValue;
          var changeAbs;
          if(change>=0){changeAbs=1;}else{changeAbs=-1};
          var height = scaleYChangeCountry(Math.abs((d[type][0][countryCode])-prevValue));
          if(changeAbs==1){return 77-height+changeGraphYOffset+5;}; // if a positive value
          if(changeAbs==-1){return 79+changeGraphYOffset+5;}; // if a positive value
        })
        .attr("fill", function(d,i){var type = $('#type').val(); if(i>=1){prevValue=(dataset[i-1][type][0][countryCode]);} if(((d[type][0][countryCode])-prevValue)>=0){return graphUpColor;}
          else{return graphDownColor;}
        });

  } else {

    var scaleYChange = d3.scale.linear()
      .domain([0,2663045])
      .range([0,graphHeight/2-10]);

    changeChart.selectAll(".graphChangeIncreases rect")
      .data(dataset)
      .transition()
      .duration(700)
        .attr('height', function(d,i){return scaleYChange(Math.abs(d['ASY'][0].Increases));  })
        .attr("y", function(d,i){
          return 50-scaleYChange(Math.abs(d['ASY'][0].Increases));;
        })
        .attr("fill", function(d,i){return graphUpColor;});

    changeChart.selectAll(".graphChangeDecreases rect")
      .data(dataset)
      .transition()
      .duration(700)
        .attr('height', function(d,i){return scaleYChange(Math.abs(d['ASY'][0].Decreases));  })
        .attr("y", function(d,i){
          return 50;
        })
        .attr("fill", function(d,i){return graphDownColor;});
  }
}

// COUNTRY MAP TOOLTIP FUNCTION
$("#map").mousemove(function(e) {
  var x_offset = 20;
  var y_offset = -5;
  $('#map_tooltip').css('left', e.clientX + x_offset).css('top', e.clientY + y_offset);
});

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


/*
var dataset = [14,6,30,60];

var svg = d3.select("svg");

var circles = svg.selectAll("circle")
  .data(dataset)
  .enter()
  .append("circle");

circles
      .attr("cx", function(d,i){return (i+1)*50})
      .attr("r", function(d,i){return d})
      .attr("cy", 90)
      .attr("opacity", 0.4)
      .style("stroke", "blue")
      .style("stroke-width", "3")
      .style("fill", "green");



 var paper = new Raphael(document.getElementById('map'), 1200, 900);
    var worldProjection = d3.geo.equirectangular()
          .scale(150)
          .translate([530,280]);

  var border_color = "#FFFFFF";
        var unselected_color = "#BDBDBD";
        var selected_color = "#999";

     $.getJSON("js/world.geojson", function(data) {
            svg_borders = {};
            world_bg = {};
            countryant = "";
            $.each(data["features"], function(idx,feature) {
                country = feature.properties.CNTRY_NAME;
                startYear = feature.properties.COWSYEAR;
                endYear = feature.properties.COWEYEAR;
                if (country != countryant) {
                    countryant = country;
                    svg_borders[country]=[];
                    world_bg[country]=[];
                }
                var polygons;
                polygons = [];
                if (feature.geometry.type == "MultiPolygon") {
                    polygons = feature.geometry.coordinates;
                } else { // Single polygon
                    polygons[0] = feature.geometry.coordinates;
                }

                $.each(polygons, function (idxpolygon, polygon) {
                    $.each (polygon, function (idxline, geojson_line) {
                        var line;
                        var i;
                        var str_line = "M ";
                        for (var i=0, l=geojson_line.length;i<l;i+=1) {
                            if (i> 0) str_line += " L "
                            xy = worldProjection(geojson_line[i]);
                            str_line += xy[0] + " " + xy[1];
                        }
                     //   str_line += " Z";
                        line = paper.path(str_line);
                        line.attr({stroke:border_color,'stroke-width':0,'fill':selected_color});
                        line.startYear=1900;
                        line.endYear=maxYear;
                        line.id="bg";
                        svg_borders[country].push(line);
                       // world_bg[country].toBack();
                    });
                });

                $.each(polygons, function (idxpolygon, polygon) {
                    $.each (polygon, function (idxline, geojson_line) {
                        var line;
                        var i;
                        var str_line = "M ";
                        for (var i=0, l=geojson_line.length;i<l;i+=1) {
                            if (i> 0) str_line += " L "
                            xy = worldProjection(geojson_line[i]);
                            str_line += xy[0] + " " + xy[1];
                        }
                        str_line += " Z";
                        line = paper.path(str_line);
                        line.attr({stroke:border_color,'stroke-width':0.5,'fill':unselected_color});
                        line.country=country;
                        line.id=country;
                        line.startYear=startYear;
                        line.endYear=endYear;
                        $(line.node).click( get_click_handler(country));
                        $(line.node).mousemove( get_over_handler(country, startYear, endYear));
                        $(line.node).mouseout( get_out_handler(country));
                        svg_borders[country].push(line);
                    });
                });



            });
        });

function test(){

         //    var test = paper.getById('Greenland').start;


     paper.forEach(function(element) {
      var yearStart = element.startYear;
      if(yearStart<1980){
        //alert(element.start);
element.hide();
      }


});

}


        function get_click_handler(country){
            return function(){
                //previousCountry = currentCountry;
                //currentCountry = country;
                //redraw();
                              //  window.location.href = "/maps/map.php?country=" + codes[country];
                            }
        }


function get_over_handler(country, startYear, endYear){
            return function(event){
                color_country(country,selected_color);

                var country_name =  $("#country_name_popup");
                country_name.empty();
                country_name.append("<span id='popup_country_name'> " + country + " (" +startYear +"->"+endYear + "</span><table width='100%'>");
                country_name.css("display","block");
                var canvasContainer = $("#container");
                var canvasTop = canvasContainer.offset().top;
                var canvasLeft = canvasContainer.offset().left;
                country_name.css("top",event.clientY+10);
                country_name.css("left",event.clientX+30);
            }
        }

                function get_out_handler(country){
            return function(event){
                var found=false;
                var i;
                var l;
                var country_name = $("#country_name_popup");
                country_name.css("display","none");
                color_country(country,unselected_color);
            }
        }

        function color_country(country,color,strokeColor)
        {
            var i;
            var l;
            if (svg_borders.hasOwnProperty(country))
                for (i=0, l= svg_borders[country].length;i<l;i++)
                {
                    if (strokeColor)
                        svg_borders[country][i].animate({"fill":color,"stroke":strokeColor,"stroke-width":2},333);
                    else
                        svg_borders[country][i].animate({"fill":color,"stroke":border_color,"stroke-width":1},333);
                }
        }
*/
