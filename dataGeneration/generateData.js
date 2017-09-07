// This script generates/updates the file data.js
// that feeds into the visualization.
//
// Run this using the Node.js command line:
// node generateData.js
//
// But first, run this script that fetches the source data:
// sh fetchData.sh
var fs = require('fs'),
    d3 = Object.assign(require('d3-collection'),require('d3-array')),
    outputFile = '../data.js',
    data = JSON.parse(fs.readFileSync('time_series.json', 'utf8'));

// The structure we're dealing with for each element of the data array:
// { year: 1951,
//   country_of_residence: 'AUS',
//   country_of_residence_en: 'Australia',
//   country_of_origin: 'XXC',
//   country_of_origin_en: 'Various/Unknown',
//   value: 180000 }
var residences = data.map(d => d.country_of_residence);
var origins = data.map(d => d.country_of_origin);
var allCountryCodes = d3.set(residences.concat(origins)).values();

var yearToDataEntry = {};
function getDataEntry(year){
  var entry = yearToDataEntry[year];
  if(!entry){
    entry = yearToDataEntry[year] = {
      year: +year,
      ORI: [{ Total: 0, Increases: 0, Decreases: 0}],
      ASY: [{ Total: 0, Increases: 0, Decreases: 0}]
    };

    // Fill in zero for missing data.
    allCountryCodes.forEach(function (country_code) {
      entry.ORI[0][country_code] = 0;
      entry.ASY[0][country_code] = 0;
    });
  }
  return entry;
}

function ori(year){ return getDataEntry(year).ORI[0]; }
function asy(year){ return getDataEntry(year).ASY[0]; }

function sumValues(values) {
  return d3.sum(values, function(d) {
    return d.value;
  })
}

// Compute the sums for each (year, country_of_origin) combination
d3.nest()
  .key(function (d) { return d.year; })
  .key(function (d) { return d.country_of_origin; })
  .rollup(sumValues)
  .entries(data)
  .forEach(function (d){
    var year = d.key;
    d.values.forEach(function (value) {
      ori(year)[value.key] = value.value;
      ori(year).Total += value.value;
    });
  });

// Compute the sums for each (year, country_of_residence) combination
d3.nest()
  .key(function (d) { return d.year; })
  .key(function (d) { return d.country_of_residence; })
  .rollup(sumValues)
  .entries(data)
  .forEach(function (d){
    var year = d.key;
    d.values.forEach(function (value) {
      asy(year)[value.key] = value.value;
      asy(year).Total += value.value;
    });
  });

var years = Object.keys(yearToDataEntry);
var minYear = d3.min(years);
var maxYear = d3.max(years);

years.forEach(function (year){
  if(year !== minYear){
    // Compute differences for ASY
    var asy0 = asy(year - 1);
    var asy1 = asy(year);
    var asyChanges = allCountryCodes.map(function (country_code){
      return asy1[country_code] - asy0[country_code];
    });
    var asyIncreases = asyChanges.filter(function (difference) {
      return difference > 0;
    });
    var asyDecreases = asyChanges.filter(function (difference) {
      return difference < 0;
    });
    asy1.Increases = d3.sum(asyIncreases);
    asy1.Decreases = d3.sum(asyDecreases);

    // Compute differences for ORI
    var ori0 = ori(year - 1);
    var ori1 = ori(year);
    var oriChanges = allCountryCodes.map(function (country_code){
      return ori1[country_code] - ori0[country_code];
    });
    var oriIncreases = oriChanges.filter(function (difference) {
      return difference > 0;
    });
    var oriDecreases = oriChanges.filter(function (difference) {
      return difference < 0;
    });
    ori1.Increases = d3.sum(oriIncreases);
    ori1.Decreases = d3.sum(oriDecreases);
  }
});

console.log('var minYear = ' + minYear + ';');
console.log('var maxYear = ' + maxYear + ';');
console.log('var totalYears = maxYear - minYear;');
console.log('var selectedYear = maxYear;');
console.log('var MaxTotal = ' + d3.max(years.map(function (year){
  return d3.max([ asy(year).Total, ori(year).Total ]);
})) + ';');

var outputData = years.map(getDataEntry);
var outputJS = 'var dataset = ' + JSON.stringify(outputData);
fs.writeFileSync(outputFile, outputJS);
