// This script generates/updates the file data.js
// that feeds into the visualization.
//
// Run this using the Node.js command line:
// node generateData.js
//
// But first, run this script that fetches the source data:
// sh fetchData.sh
var fs = require('fs'),
    d3 = Object.assign(
      require('d3-dsv'),
      require('d3-collection'),
      require('d3-array')
    ),
    outputFile = '../data.js',
    csvStringRaw = fs.readFileSync('time_series.csv', 'utf8'),
    csvString = csvStringRaw.substr(170), // Chop off the junk in first few lines.
    csvData = d3.csvParse(csvString),
    list = JSON.parse(fs.readFileSync('list.json', 'utf8'));

// Lookup table mapping country/region names to codes.
var nameToCodeMap = {};
list.forEach(function (d) {
  nameToCodeMap[d.name_en] = d.country_code;
});

var nameCorrections = {};
nameCorrections['United Kingdom'] = 'United Kingdom of Great Britain and Northern Ireland';
nameCorrections['China, Hong Kong SAR'] = 'Hong Kong SAR, China';
nameCorrections['China, Macao SAR'] = 'Macao SAR, China';
nameCorrections['Serbia and Kosovo (S/RES/1244 (1999))'] = 'Serbia (and Kosovo: S/RES/1244 (1999))';
nameCorrections['Cabo Verde'] = 'Cape Verde';
nameCorrections['Palestinian'] = 'State of Palestine'; // Possibly could be 'Palestinian Territory, Occupied'
nameCorrections['Holy See (the)'] = 'Holy See';
nameCorrections['Bonaire'] = 'Bonaire, Sint Eustatius and Saba';
nameCorrections['Curaçao'] = 'Curacao';
nameCorrections['Saint-Pierre-et-Miquelon'] = 'Saint Pierre and Miquelon';
nameCorrections['Wallis and Futuna Islands '] = 'Wallis and Futuna Islands';
var unknownNames = {};

function correctName(name){
  name = name.replace('Rep.', 'Republic');
  name = name.replace('Dem.', 'Democratic');
  return nameCorrections[name] || name;
}

function nameToCode(name) {
  var code = nameToCodeMap[correctName(name)];
  if(!code){
    unknownNames[name] = true;
  }
  return code;
}

var augmentedData = csvData
  .map(function (d) {
    
    // Parse the value into a number.
    d.Value = +d.Value;

    // Convert the origin and asylum names into codes.
    var originName = d.Origin;
    var asylumName = d['Country / territory of asylum/residence'];
    d.ORI = nameToCode(originName);
    d.ASY = nameToCode(asylumName);
    d.hasCodes = d.ORI && d.ASY;

    //console.log(d['Population type']);
    return d;
  })
  .filter(function (d) { return d.hasCodes; });

console.log('Unable to find codes for the following places:');
console.log(Object.keys(unknownNames));

function sumValues(values) {
  return d3.sum(values, function(d) {
    return d.Value;
  })
}

var nestedByORI = d3.nest()
  .key(function (d) { return d.Year; })
  .key(function (d) { return d.ORI; })
  .rollup(sumValues)
  .entries(augmentedData);

var nestedByASY = d3.nest()
  .key(function (d) { return d.Year; })
  .key(function (d) { return d.ORI; })
  .rollup(sumValues)
  .entries(augmentedData);

var yearToDataEntry = {};
function getDataEntry(year){
  var entry = yearToDataEntry[year];
  if(!entry){
    entry = yearToDataEntry[year] = {
      year: +year,
      ORI: [{}],
      ASY: [{}]
    };
  }
  return entry;
}

function ori(year){ return getDataEntry(year).ORI[0]; }
function asy(year){ return getDataEntry(year).ASY[0]; }

nestedByORI.forEach(function (d){
  var year = d.key;
  d.values.forEach(function (value) {
    ori(year)[value.key] = value.value;
  });
});

nestedByASY.forEach(function (d){
  var year = d.key;
  d.values.forEach(function (value) {
    asy(year)[value.key] = value.value;
  });
});

var data = Object.keys(yearToDataEntry)
  .map(getDataEntry);

var outputJS = 'var dataset = ' + JSON.stringify(data);

fs.writeFileSync(outputFile, outputJS);
