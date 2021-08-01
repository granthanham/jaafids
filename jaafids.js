/*
__________________________________________________________________________
Title:			JavaScript Array of Array Functions Inspired By Dplyr and SQL
Purpose:		Use dplyr verbs to manipulate array of array json data structures
				Aliases are included e.g. head/top, distinct/unique, filter/where
Instructions:	ReactJS: Uncomment module.exports and load with
				import {names, colNameToIndex} from './jaafids.js';

				Node: load with (keeps namespace)
				var jaafids = require('./jaafids');

				Node: Ugly hack for node but works without namespace
				
				var fs = require("fs");

				function read(f) {
				return fs.readFileSync(f).toString();
				}
				function include(f) {
				eval.apply(global, [read(f)]);
				}

				include('./jaafids.js');

Author:			Grant Hanham
Date:			17 June 2021
Functions:		1)	names(df)
						returns the column names of a dataframe (df)
				2)	top(df, n = 6) alias head(df, n = 6)
						top n records (with a header) from a df, traps for n being larger than the df
						SELECT top n * FROM df;
				3)	distinct(df, cols) alias unique(df, cols)
						returns only unique or distinct values from a df. Same as:
							SELECT distinct col1, col2, FROM df;
						If no columns are specified then returns distinct/unique values of all columns
						note scales poorly for many unique values
				4)	colNameToIndex(df, col)
						given the name of a single column of a df returns the ordinal position
				5)	colNamesToIndices(df, cols)
						given the names of columns of a df returns the ordinal positions (array)
				6)	filter(df, toFilterObject) alias where(df, toFilterObject)
						filter based on criteria - won't filter for All.
						let filterList = {DHB_of_service: ['Northland', 'Waitemata'], Ethnicity: ['All'], waitlist_grouped: ['FSA']}
							SELECT * FROM df WHERE DHB_of_service in ('Northland', 'Waitemata') AND waitlist_grouped = 'FSA';
				7)	objectToArr (filterToArr(toFilter) -- rename this)
						internal function formats into array when it's not an array - else ignores
				8)	filterToOrd(df, toFilter) (consider renaming - )
						turns filter request in column names into a structure for filtering by ordinal position
						e.g. let filterList = {DHB_of_service: ['Northland', 'Waitemata'], Ethnicity: ['All'], waitlist_grouped: ['FSA']}
				9)	select(df, cols)
						returns an array of arrays with only the named columns. Same as:
							SELECT col1, col2 FROM df;
				10)	filterSelect(df, toFilterObject, cols)
						faster than separate operations of select(filter(df, filterList), selectCols);
							SELECT col1, col2 FROM df WHERE DHB_of_service in ('Northland', 'Waitemata') AND waitlist_grouped = 'FSA';
				11) count(df, cols, name = 'n')
					if no columns then df rows, if there are columns then it's the same as:
					SELECT col1, col2, COUNT(*) as name FROM df GROUP BY col1, col2;
				12) sum(df, aggCols, sumCols)
					Same as:
					SELECT col1, col2, SUM(sumCols) as sumCols FROM df GROUP BY col1, col2;
				TO DO:
					perform aggregations on multiple columns - i.e. sum 2 cols, sum and count, maybe on day avg
					Create a new columns based on a calculation
				Later:
					order/arrange with custom sort orders
					Consider using this and impacts on being able to use in javascript - easier/better what does it do?
					rename columns?
					Summing by multiple columns
					Custom aggs to filter by - done
					Custom aggs for distinct, count, sum
					how long to shallow copy?
__________________________________________________________________________
*/
// Uncomment this when using in ReactJS
//module.exports = {names, colNameToIndex, colNamesToIndex, select, formatFilter};


// Import these later - included for testing for now

/**
 * Data for custom aggregation
 */
 refCustomGroups = {
	'Non-Māori': ["Pacific Peoples", "Asian", "European", "Other"],
	"Māori/Pacific": ["Māori", "Pacific Peoples"],
	"Non-Māori/Pacific": ["Asian", "European", "Other"],
	"Metro": ["Waitemata", "Auckland", "Counties Manukau"],
};


/**
 * Data for custom sorting
 */
 refCustomSortOrder = {
	'DHB_of_service': {
		'Northland': 1,
		'Waitemata': 2,
		'Auckland': 3,
		'Counties Manukau': 4,
		'Metro': 5,
	},
	'Ethnicity': {
		'Māori': 1,
		'Pacific Peoples': 2,
		'Asian': 3,
		'European': 4,
		'Other': 5,

		// Ethnicity Groupings
		'Non-Māori': 6,
		'Māori/Pacific': 3,
		'Non-Māori/Pacific': 3,
		},
}
// refCustomSortOrder.DHB_of_service.Auckland
// refCustomSortOrder['DHB_of_service']['Auckland']





/**
 * @summary <h5>Summary:</h5> Get the "Column Names" from an array of arrays
 * @description Same as base R names
 * 
 * @param {array} df JavaScript Array of Arrays. First row is the "header"
 * 
 * @returns {array} The "column" names of the data
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * names(testdata);
 * > ['Country', 'Gender', 'Population']
 */
function names(df) {
	return df[0];
}

/**
 * @summary <h5>Summary:</h5> Get the first n rows of data
 * @description Same as base R/Linux head, T-SQL TOP, SQL LIMIT. See also: {@link top}, {@link limit}
 * 
 * @param {array} df JavaScript Array of Arrays. First row is the "header"
 * @param {number} n The number of rows of data
 * @returns {array} First n rows of data
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * head(testdata, n = 1);
 * > [
 * >    ['Country', 'Gender', 'Population']
 * >  , ['NZ'     , 'Male'  ,  140]
 * > ]
 */
function head(df, n = 6) {
	// Trap for situations where the DF has fewer rows than requested number of rows
	if (df.length < n) {n = df.length -1}
	let dfOut = [];
	for (let dfIndex = 0; dfIndex < n + 1; dfIndex++) { // assuming that there will be a header so want n+1 rows
		const dfElement = df[dfIndex];
		dfOut.push(dfElement);
	}
	return dfOut;
}


// Alias for head
/**
 * @summary <h5>Summary:</h5> Get the first n rows of data
 * @description Same as base R/Linux head, T-SQL TOP, SQL LIMIT. See also: {@link head}, {@link limit}
 * 
 * @param {array} df JavaScript Array of Arrays. First row is the "header"
 * @param {number} n The number of rows of data
 * @returns {array} First n rows of data
 * @link head
 * @link limit
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * top(testdata, n = 1);
 * > [
 * >    ['Country', 'Gender', 'Population']
 * >  , ['NZ'     , 'Male'  ,  140]
 * > ]
 */
function top(df, n){
	return head(df, n);
}

// Alias for head
/**
 * @summary <h5>Summary:</h5> Get the first n rows of data
 * @description Same as base R/Linux head, T-SQL TOP, SQL LIMIT. See also: {@link head}, {@link top}
 * 
 * @param {array} df JavaScript Array of Arrays. First row is the "header"
 * @param {number} n The number of rows of data
 * @returns {array} First n rows of data
 * @link head
 * @link top
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * limit(testdata, n = 1);
 * > [
 * >    ['Country', 'Gender', 'Population']
 * >  , ['NZ'     , 'Male'  ,  140]
 * > ]
 */
function limit(df, n){
	return head(df, n);
}






/**
 * @summary <h5>Summary:</h5> Get the ordinal positions of all requested "Column Names" from an array of arrays
 * @description Given the names of columns in a dataframe return their ordinal position. Note JS's first position is 0.
 * 
 * @param {array} df JavaScript Array of Arrays. First row is the "header"
 * @param {string} col Column Name in the data
 * @returns {number} Ordinal Position of the requested column
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * // Note: JS starts from 0 i.e. [0, 1, 2]
 * colNameToIndex(testdata, 'Gender');
 * > 1
*/
function colNameToIndex(df, col){
	let index = df[0].indexOf(col);
	// if (index == -1) {console.log('Warning column name not in the data:', col);} //Trap for when the col/cols are not in the data
	return index
}


/**
 * @summary <h5>Summary:</h5> Get the ordinal position of a "Column Name" from an array of arrays
 * @description Given the name of a single column of a dataframe return it's ordinal position. Note JS's first position is 0.
 * 
 * @param {array} df JavaScript Array of Arrays. First row is the "header"
 * @param {array} cols The "column" names of the data
 * @returns {array} Array of the ordinal positions of the requested columns
 * 
 * @example
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * // Note: JS starts from 0 i.e. [0, 1, 2]
 * colNameToIndex(testdata, ['Country', 'Population']);
 * > [0, 2]
 * 
*/
function colNamesToIndices(df, cols){
	if (typeof cols === 'string' || cols instanceof String) {
		cols = cols.split()
	};
	let indices = [];
	cols.forEach(element => {
		indices.push(df[0].indexOf(element))
	});
	/* This can cause some problems could trap for intent with string????
	if (indices.length === 1) {
		indices = Number(indices);
	}
	*/
	return indices;
}


/**
 * @summary <h5>Summary:</h5> Internal function to return columns in the requested order
 * @description Given the ordinal positions of columns return them in that order {@link colNamesToIndices}
 * 
 * @param {array} dfRow A row of data - i.e. an array
 * @param {array} colIndices The ordinal positions in the array. Usually converted using {@link colNamesToIndices}
 * @returns {array}
 * 
 * @example
 * 
 * var ARowOfData = ['NZ'     , 'Male'  , 140];
 * selectRow(ARowOfData, [0, 2];
 * > ['NZ', 140]
 * selectRow(ARowOfData, [2, 0];
 * > [140, 'NZ']
 */
function selectRow(dfRow, colIndices){
	/* Internal function to return columns in the correct order */
	// let row = colIndices.map((item) => dfRow[item])
	let row = [];
	for (let colIndex = 0; colIndex < colIndices.length; colIndex++) {
		const colElement = colIndices[colIndex];
		row.push(dfRow[colElement])
	}
	return row;
}

/**
 * @summary <h5>Summary:</h5> Get the "Columns" in the requested order from an array of arrays
 * @description Given an array of "Column Names" return them in that order. Also returns the "Header". Uses {@link colNamesToIndices}.
 * 
 * @param {array} df A row of data - i.e. an array
 * @param {array|string} cols Array or string of the "Column Names" {@link colNamesToIndices}. I always forget to put a single column into an array.
 * @returns {array} A dataframe in the format of JavaScript Array of Arrays.
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * select(testdata, ['Country', 'Population']);
 * > [
 * >     ['Country', 'Population']
 * >   , ['NZ'     ,  140]
 * >   , ['NZ'     ,  120]
 * >   , ['AU'     ,  440]
 * >   , ['AU'     ,  460]
 * >   , ['USA'    , 4400]
 * >   , ['USA'    , 4600]
 *> ]
 */
function select(df, cols){
	if (typeof cols === 'string' || cols instanceof String) {
		cols = cols.split()
	};
	let keepCols = colNamesToIndices(df, cols);
	let selected = [];
	for (let dfIndex = 0; dfIndex < df.length; dfIndex++) {
		const dfRow = df[dfIndex];
		selected.push(selectRow(dfRow, keepCols));
		// selected.push(keepCols.map((item) => dfRow[item]));
	}
	return selected;
}









// Later on we will want to specify exactly what columns we wish to aggregate with
// for now just get the blessed thing to work
// scales badly but then we are only needing relatively small pieces of aggregate data
// To Do: add in the column order that are to be made distinct

/**
 * @summary <h5>Summary:</h5> Get distinct/unique values of "Columns" in the requested order from an array of arrays
 * @description Given an array of "Column Names" return unique/distinct values. Also returns the "Header". See also: {@link unique}.
 * 
 * @param {array} df A row of data - i.e. an array
 * @param {array} cols Array of the "Column Names"
 * @returns {array} A dataframe in the format of JavaScript Array of Arrays.
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * distinct(testdata, ['Country']);
 * > [
 * >     ['Country']
 * >   , ['NZ']
 * >   , ['AU']
 * >   , ['USA']
 *> ]
 */
function distinct(df, cols = []) {
	let agg = [];
	if (cols.length == 0) {
		for (let dfIndex = 0; dfIndex < df.length; dfIndex++) {
			const dfElement = df[dfIndex];
			if (!aggAlreadyExists(agg, dfElement)) { // If not already there then insert it
				agg.push(dfElement);
			}
		}
		return agg;
	}

	let keepCols = colNamesToIndices(df, cols);

	for (let dfIndex = 0; dfIndex < df.length; dfIndex++) {
		let dfElement = selectRow(df[dfIndex], keepCols);
		// console.log(dfElement);
		// const dfElement = dfRow.filter((x,i) => keepCols.includes(i)); // To Do: Ability to sort the column output in same order as the cols parameter
		if (!aggAlreadyExists(agg, dfElement)) { // If not already there then insert it
			agg.push(dfElement);
		}
	}
	return agg;
}


// Alias for distinct
/**
 * @summary <h5>Summary:</h5> Get distinct/unique values of "Columns" in the requested order from an array of arrays
 * @description Given an array of "Column Names" return unique/distinct values. Also returns the "Header". See also: {@link distinct}.
 * 
 * @param {array} df A row of data - i.e. an array
 * @param {array} cols Array of the "Column Names"
 * @returns {array} A dataframe in the format of JavaScript Array of Arrays.
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * unique(testdata, ['Country']);
 * > [
 * >     ['Country']
 * >   , ['NZ']
 * >   , ['AU']
 * >   , ['USA']
 * > ]
 */
function unique(df){
	return distinct(df);
}

// To Do: Finish jsdoc
/**
 * Internal function
 * @param {array} custom_agg 
 * @param {array} custom_agg_key 
 * @returns x
 */
function aggReverseLookup(custom_agg, custom_agg_key) {
	// aggReverseLookup(custom_agg_list, 'Non-Māori')
	let aggReverseLookup = {};
	let indAgg = custom_agg[custom_agg_key];
	// If no lookup then return same key and value?
	if (indAgg === undefined) {
		aggReverseLookup[custom_agg_key] = custom_agg_key;
		return aggReverseLookup;
	}
	for (let indAggLine = 0; indAggLine < indAgg.length; indAggLine++) {
		const element = indAgg[indAggLine];
		aggReverseLookup[element] = custom_agg_key;
	}
	return aggReverseLookup;
}

// To Do: Finish jsdoc - confirm string - can this be generalised to any length of cols
// Also consider trapping for types different functions for date/numbers v strings
/**
 * 
 * @param {array} df 
 * @param {string} col 
 * @returns x
 */
function minOfAColumn(df, col) {
	let singlecol = distinct(df, col);
	singlecol.shift();
	return singlecol.reduce(function (a, b) { return a < b ? a : b; }); 
}

// To Do: Finish jsdoc - confirm string - can this be generalised to any length of cols
// Also consider trapping for types different functions for date/numbers v strings
/**
 * 
 * @param {array} df 
 * @param {string} col 
 * @returns x
 */
function maxOfAColumn(df, col) {
	let singlecol = distinct(df, col);
	singlecol.shift();
	return singlecol.reduce(function (a, b) { return a > b ? a : b; }); 
}


// To Do: Finish jsdoc - needs simplifying and using the parts for sorts, distinct/grouping (need to change the column to new grouping and be aware of overlaps e.g. Non-Maori and European being selected)
/**
 * 
 * @param {array} df 
 * @param {array} toFilterObject 
 * @returns x
 */
function filterWithAgg(df, toFilterObject){
	// Could also add a flag as to whether you want the header or not
	let toFilterArr = filterToArr(toFilterObject);
	let toFilter = filterToOrd(df, toFilterArr);
	filter_out = [];

	// Own function to expand aggregates
	for (let indexFilt = 0; indexFilt < toFilter.length; indexFilt++) {
		let indFilter = toFilter[indexFilt];
		// console.log(indFilter);
		let filterInner = [];
		for (let indexIndFilter = 0; indexIndFilter < indFilter[1].length; indexIndFilter++) {
			filter_agg = refCustomGroups[indFilter[1][indexIndFilter]];
			if (filter_agg === undefined) {
				// console.log('Undefined.....');
				// console.log(indFilter[1][indexIndFilter]);
				filterInner = filterInner.concat([indFilter[1][indexIndFilter]]);
				// console.log(filterInner);
				// break;
				continue;
			}
			filterInner = filterInner.concat(filter_agg);
			// console.log(filterInner);
		}

		// console.log(toFilter[indexFilt][0]);
		// Timing doesn't seem to change much if this is in or out
		// filterInner = [... new Set(filterInner)] // make each filter item unique // test if this is needed or not
		// console.log(filterInner);
		tout = [];
		tout.push(toFilter[indexFilt][0]);
		tout.push(filterInner);
		filter_out.push(tout);
	}
	// toFilter = [... filter_out];
	toFilter = filter_out; // quicker with this version
	
	/*
	Test if we need to filter at all
	This can also be applied if we hit refresh - should simply skip filtering an use all data
	*/
	if (toFilter.length == 0) {
		// console.log('No filtering applied');
		return df;
	}
	// console.log('Filter');
	let dfFiltered = [names(df)];
	
	for (let index = 1; index < df.length; index++) { // ignore the header
	// for (let index = 0; index < 5; index++) { // for testing
		const dataToFilter = df[index];
		let keepData = true;
		// check to see if the data contains the filter values
		for (let indexFilt = 0; indexFilt < toFilter.length; indexFilt++) {
			const filterFor = toFilter[indexFilt];
			if (! filterFor[1].includes(dataToFilter[filterFor[0]])) { // If there is any mismatch then don't keep the data
				keepData = false;
				break;
			}
		}
		if (keepData == false) {continue} // If there is any mismatch then don't filter
		dfFiltered.push(dataToFilter);
	}
	return dfFiltered;
}









// To Do: Finish jsdoc 
/**
 * Internal function checks if input is an array - if not changes it to an array
 * @param {array} toFilter 
 * @returns x
 */
function filterToArr(toFilter){
	if (!Array.isArray(toFilter)) {
		toFilter = Object.entries(toFilter); // change to array if it's not one already
	}
	return toFilter
}

// To Do: Finish jsdoc 
/**
 * Internal function - given a filter array return the ordinal positions
 * @param {array} df 
 * @param {array} toFilter 
 * @returns {number} x
 */
function filterToOrd(df, toFilter){
	let filterToOrdReturn = [];
	for (let index = 0; index < toFilter.length; index++) {
		const element = toFilter[index];
		if (element[1] == 'All') {continue}
		if (colNameToIndex(df, element[0]) == -1) {console.log('Warning filter value out of range:', toFilter[index][0]);continue;}
		filterToOrdReturn.push([colNameToIndex(df, element[0]), element[1]]);
		/* Note the approach in the 2 lines above gives single indentation and easier logic than
		if (element[1] != 'All') {
			filterToOrdReturn.push([colNameToIndex(df, element[0]), element[1]]);
		}
		*/
	}
	return filterToOrdReturn;
}

// To Do: Finish jsdoc 
/**
 * Filters data with given arrays. See also {@link where}
 * @param {array} df 
 * @param {array} toFilterObject 
 * @returns x
 */
function filter(df, toFilterObject){
	// Could also add a flag as to whether you want the header or not
	let toFilterArr = filterToArr(toFilterObject);
	let toFilter = filterToOrd(df, toFilterArr);
	let dfFiltered = [names(df)];
	
	/*
	Test if we need to filter at all
	This can also be applied if we hit refresh - should simply skip filtering an use all data
	*/
	if (toFilter.length == 0) {
		// console.log('No filtering applied');
		return df;
	}
	// console.log('Filter');
	
	for (let index = 1; index < df.length; index++) { // ignore the header
		const dataToFilter = df[index];
		let keepData = true;
		// check to see if the data contains the filter values
		for (let indexFilt = 0; indexFilt < toFilter.length; indexFilt++) {
			const filterFor = toFilter[indexFilt];
			if (! filterFor[1].includes(dataToFilter[filterFor[0]])) { // If there is any mismatch then don't keep the data
				keepData = false;
				break;
			}
		}
		if (keepData == false) {continue} // If there is any mismatch then don't filter
		dfFiltered.push(dataToFilter);
	}
	
	return dfFiltered;
}

// Alias for filter if people are more comfortable with that syntax (SQL vs dplyr)

// To Do: Finish jsdoc 
/**
 * Alias for filter see {@link filter}
 * @param {*} df 
 * @param {*} toFilter 
 * @returns x
 */
function where(df, toFilter){
	return filter(df, toFilter);
}


/*
Filter and Select - good to combined because we are in there anyway
*/

// To Do: Finish jsdoc 
/**
 * Faster than separately filtering then selecting or vice versa
 * @param {array} df 
 * @param {array} toFilterObject 
 * @param {array} cols 
 * @returns x
 */
function filterSelect(df, toFilterObject, cols){
	let keepCols = colNamesToIndices(df, cols);
	let toFilterArr = filterToArr(toFilterObject);
	let toFilter = filterToOrd(df, toFilterArr);
	let dfFiltered = [];
	dfFiltered.push(keepCols.map((item) => names(df)[item]))
	
	/*
	Test if we need to filter at all
	This can also be applied if we hit refresh - should simply skip filtering an use all data
	*/
	if (toFilter.length == 0) {
		// console.log('No filtering applied');
		return select(df, cols);
	}
	// console.log('Filter');
	
	for (let index = 0; index < df.length; index++) {
		const dataToFilter = df[index];
		let keepData = true;
		// check to see if the data contains the filter values
		for (let indexFilt = 0; indexFilt < toFilter.length; indexFilt++) {
			const filterFor = toFilter[indexFilt];
			if (! filterFor[1].includes(dataToFilter[filterFor[0]])) { // If there is any mismatch then don't filter
				keepData = false;
				break;
			}
		}
		if (keepData == false) {continue} // If there is any mismatch then don't filter
		let out = keepCols.map((item) => dataToFilter[item])

		dfFiltered.push(out);
	}
	return dfFiltered;
}

// To Do: Finish jsdoc 
/**
 * Internal function, tests if a row of data has already been iterated through
 * @param {array} dfKeepAgg 
 * @param {array} dfRow 
 * @returns BOOLEAN
 */
function aggAlreadyExists(dfKeepAgg, dfRow){
	for (let index = 0; index < dfKeepAgg.length; index++) {
		const element = dfKeepAgg[index];
		if (
			// The first two are really good for generally comparing arrays
			// Array.isArray(element) && Array.isArray(dfRow) &&
			// element.length === dfRow.length &&
			element.every((val, index) => val === dfRow[index])) {
				return true;
		}
	}
	return false;
}







// To Do: Finish jsdoc 
/**
 * Internal function, tests if two arrays are the same
 * @param {array} array1 
 * @param {array} array2 
 * @param {array} cols 
 * @returns BOOLEAN
 */
function areArraysTheSame(array1, array2, cols){
	for (var colIndex = 0; colIndex < cols.length; ++colIndex) {
		if (array1[colIndex] !== array2[colIndex]) {return false};
	}
	return true;
}

// To Do: Finish jsdoc 
/**
 * Internal function adds 1 if the row data already exists
 * @param {array} dfKeepAgg 
 * @param {array} dfRow 
 * @param {array} cols 
 * @returns {array} Data with counts of occurrences
 */
function countAlreadyExists(dfKeepAgg, dfRow, cols){
	let dfKeepAggLength = dfKeepAgg.length;
	let noCols = cols.length;
	for (let dfKeepIndex = 0; dfKeepIndex < dfKeepAggLength; dfKeepIndex++) {
		const keepRow = [...dfKeepAgg[dfKeepIndex]];
		keepRow.pop();
		if (areArraysTheSame(keepRow, dfRow, cols)) {
			// let tempsum = dfKeepAgg[dfKeepIndex].pop() + 1;
			dfKeepAgg[dfKeepIndex][noCols] += 1;
			// dfKeepAgg[dfKeepIndex].push(dfKeepAgg[dfKeepIndex].pop() + 1);
			return dfKeepAgg;
		} 
	}
	dfRow.push(1);
	dfKeepAgg.push(dfRow);
	return dfKeepAgg;
}


/**
 * @summary <h5>Summary:</h5> Counts the number of unique items within columns
 * 
 * @description If no columns are request then df rows. If there are columns then it's the same as:
 *
 * SELECT col1, col2, COUNT(*) as name FROM df GROUP BY col1, col2;
 * 
 * @param {array} df A dataframe in the array of arrays format
 * @param {array} cols The columns that you want to count for
 * @param {string} countName Name for the column that will contain the counts
 * @returns {array} Dataframe in an array of arrays format
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * count(testdata, cols = ['Gender'], name = 'RowCount');
 * 
 * > [
 * >     ['Gender', 'RowCount']
 * >   , ['Male'  , 3]
 * >   , ['Female', 3]
 * > ]
 * 
 */
function count(df, cols = [], countName = 'n'){
	if (cols.length == 0) {return df.length - 1}
	let agg = [];
	
	let firstRow = [...cols]; // copy the values
	firstRow.push(countName);
	agg.push(firstRow);
	
	let keepCols = colNamesToIndices(df, cols);
	let dfLength = df.length;
		// for (let dfIndex = 1; dfIndex < 10; dfIndex++) { For testing
		// for (let dfIndex = 1; dfIndex < df.length; dfIndex++) { // tests speed diff
		for (let dfIndex = 1; dfIndex < dfLength; dfIndex++) {
			let dfRow = selectRow(df[dfIndex], keepCols);
			agg = countAlreadyExists(agg, dfRow, cols);
		}
		return agg;
}


// To Do: Generalise so we can sum multiple "columns"
// Test if the generalised version works with single - if not then parse into the single by length
/**
 * @summary <h5>Summary:</h5> Sums a column by unique items of columns
 * 
 * @description The same as SELECT col1, col2, SUM(sumCols) as sumCols FROM df GROUP BY col1, col2;
 * 
 * @param {array} df A dataframe in the array of arrays format
 * @param {array} cols The columns that you want to group by
 * @param {array} colsToSum Name of the column to be summed
 * @returns {array} Dataframe in an array of arrays format
 * 
 * @example
 * 
 * var testdata = 
 * [
 *       ['Country', 'Gender', 'Population']
 *     , ['NZ'     , 'Male'  ,  140]
 *     , ['NZ'     , 'Female',  120]
 *     , ['AU'     , 'Male'  ,  440]
 *     , ['AU'     , 'Female',  460]
 *     , ['USA'    , 'Male'  , 4400]
 *     , ['USA'    , 'Female', 4600]
 * ];
 * 
 * sum(testdata, cols = ['Country'], colsToSum = ['Population']);
 * > [
 * >     ['Gender', 'Population']
 * >   , ['Male'  , 4980]
 * >   , ['Female', 5180]
 * > ]
 * 
 * sum(testdata, cols = ['Country'], colsToSum = ['Population']);
 * > [
 * >     ['Country', 'Population']
 * >   , ['NZ'     ,  260]
 * >   , ['AU'     ,  900]
 * >   , ['USA'    , 9000]
 * > ]
 * 
 */	
function sum(df, cols = [], colsToSum = []){
	if (cols.length == 0) {return df.length}
	let agg = [];
	
	let firstRow = [...cols].concat(colsToSum); // copy the values add sum columns
	// firstRow.push(colsToSum);
	agg.push(firstRow);
	
	let keepCols = colNamesToIndices(df, cols);
	let sumCols = colNamesToIndices(df, colsToSum);
	// console.log(sumCols);
	let dfLength = df.length;
	// for (let dfIndex = 1; dfIndex < 100; dfIndex++) {
	// for (let dfIndex = 1; dfIndex < df.length; dfIndex++) {
	for (let dfIndex = 1; dfIndex < dfLength; dfIndex++) {
		let dfRow = selectRow(df[dfIndex], keepCols);
		let dfSum = selectRow(df[dfIndex], sumCols);
		// console.log(df[dfIndex]);
		// console.log(dfSum);
		agg = sumAlreadyExists(agg, dfRow, cols, Number(dfSum));
	}
	return agg;
	}

// To Do: Finish jsdoc 	
/**
 * Internal function
 * @param {array} dfKeepAgg 
 * @param {array} dfRow 
 * @param {array} cols 
 * @param {array} dfSum 
 * @returns x
 */
function sumAlreadyExists(dfKeepAgg, dfRow, cols, dfSum){
	let dfKeepAggLength = dfKeepAgg.length;
	for (let dfKeepIndex = 0; dfKeepIndex < dfKeepAggLength; dfKeepIndex++) {
	// for (let dfKeepIndex = 0; dfKeepIndex < dfKeepAgg.length; dfKeepIndex++) {
		const keepRow = [...dfKeepAgg[dfKeepIndex]];
		keepRow.pop();
		if (areArraysTheSame(keepRow, dfRow, cols)) {
			let tempsum = dfKeepAgg[dfKeepIndex].pop() + dfSum;
			dfKeepAgg[dfKeepIndex].push(tempsum);
			// dfKeepAgg[dfKeepIndex].push(dfKeepAgg[dfKeepIndex].pop() + 1);
			// console.log(dfKeepAgg);
			return dfKeepAgg;
		} 
	}
	dfRow.push(dfSum);
	dfKeepAgg.push(dfRow);
	return dfKeepAgg;
}

// To Do: Finish jsdoc 	
// To do - consider currying - then any list of data can be combined
// Also consider that there are currently no checks that the data is the same
// To Do. Test data is the same or do what dplyr does and combines all columns and fills empty values
/**
 * Combines two array of arrays. See also {@link bind_rows}
 * @param {array} df1 First array of arrays
 * @param {array} df2 Second array to append on
 * @param {boolean} rmExcessHeaders Removes additional "header rows" 
 * @returns {array} Array of arrays that combines the two data sets
 */
function union(df1, df2, rmExcessHeaders = true) {
	if (rmExcessHeaders) {
		df2 = [... df2] // copy then get rid of the first "row"
		df2.shift();
	}
	return df1.concat(df2);
}

/**
 * Combines two array of arrays. See also {@link union}
 * @param {array} df1 First array of arrays
 * @param {array} df2 Second array to append on
 * @param {boolean} rmExcessHeaders Removes additional "header rows"
 * @returns {array} Array of arrays that combines the two data sets
 */
function bind_rows(df1, df2, rmExcessHeaders = true){
	return union(df1, df2, rmExcessHeaders);
}


/**
 * @summary <h5>Summary:</h5> Add a percentage "Column" to the data for each row of data based on numerator and denominator "Columns".
 * @description This function can be used when performance is at an absolute must. May be quicker than the generic {@link mutate}.
 * 
 * @param {array} df Dataframe in an array of array format
 * @param {string} num "Column" name of the numerator
 * @param {string} den "Column" name of the denominator
 * @param {string} newColName Name of the new "Column"
 * @returns The same data that came in but with an additional column with the name stated
 * @example
 * 
 * var current_waitlist = [
 *        ['waitlist_grouped', 'DHB_of_service'  , 'Compliant', 'NonCompliant', 'Total']
 *        ['FSA'             , 'Auckland'        , 17291      ,  305          , 17596  ]
 *        ['FSA'             , 'Counties Manukau', 10697      , 1999          , 12696  ]
 *        ['FSA'             , 'Northland'       ,  3931      , 3736          ,  7667  ]
 *        ['FSA'             , 'Waitemata'       , 12443      ,  673          , 13116  ]
 *        ['Treatment'       , 'Auckland'        ,  7094      , 1287          ,  8381  ]
 *        ['Treatment'       , 'Counties Manukau',  2912      ,  367          ,  3279  ]
 *        ['Treatment'       , 'Northland'       ,  1991      , 1715          ,  3706  ]
 *        ['Treatment'       , 'Waitemata'       ,  4431      , 1590          ,  6021  ]
 * ];
 * 
 * calcPerc(current_waitlist, 'Compliant', 'Total', 'PercentageCompliant')
 * 
 * > [
 * >      ['waitlist_grouped', 'DHB_of_service'  , 'Compliant', 'NonCompliant', 'Total', 'PercentageCompliant'],
 * >      ['FSA'             , 'Auckland'        , 17291      ,  305          , 17596  , 0.982666515117072    ],
 * >      ['FSA'             , 'Counties Manukau', 10697      , 1999          , 12696  , 0.8425488342785129   ],
 * >      ['FSA'             , 'Northland'       ,  3931      , 3736          ,  7667  , 0.5127168383983305   ],
 * >      ['FSA'             , 'Waitemata'       , 12443      ,  673          , 13116  , 0.9486886245806648   ],
 * >      ['Treatment'       , 'Auckland'        ,  7094      , 1287          ,  8381  , 0.8464383725092471   ],
 * >      ['Treatment'       , 'Counties Manukau',  2912      ,  367          ,  3279  , 0.8880756328148826   ],
 * >      ['Treatment'       , 'Northland'       ,  1991      , 1715          ,  3706  , 0.5372369131138695   ],
 * >      ['Treatment'       , 'Waitemata'       ,  4431      , 1590          ,  6021  , 0.7359242650722472   ],
 * > ];
 */
function calcPerc(df, num, den, newColName){
	let numerator = colNameToIndex(df, num);
	let denominator = colNameToIndex(df, den);
	let dfOut = [];
	dfOut.push(df[0].concat(newColName));
	for (let dfIndex = 1; dfIndex < df.length; dfIndex++) {
		const dfRow = df[dfIndex];
		let calcedValue = df[dfIndex][numerator]/df[dfIndex][denominator]
		dfOut.push(dfRow.concat(calcedValue));
	}
	return dfOut;
}

// will run anything someone puts in so need input sanitisation
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
// Keep this for now for reference only - not documented
// Superseded by the mutate function below
function calc2Col(df, newColName, colName1, operator, colName2){
	let colPos1 = colNameToIndex(df, colName1);
	let colPos2 = colNameToIndex(df, colName2);
	let dfOut = [];
	dfOut.push(df[0].concat(newColName));
	for (let dfIndex = 1; dfIndex < df.length; dfIndex++) {
		const dfRow = df[dfIndex];
		var x = df[dfIndex][colPos1];
		var y = df[dfIndex][colPos2];
		let calcedValue = eval('x'.concat(operator, 'y'));
		dfOut.push(dfRow.concat(calcedValue));
	}
	return dfOut;
}

// will run anything someone puts in so need input sanitisation
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval

// At this stage only 1 new column at a time
/**
 * @summary <h5>Summary:</h5> Create a new "Column" with a chosen name based on an arbitrary row level calculation
 * @description "Column" names MUST be within []. i.e. '[NumberVaccinated]/[Population]'. Only one column can be added at a time. If speed is of utmost importance then consider using single purpose functions. See: {@link calcPerc}
 * 
 * @param {array} df Dataframe in an array of arrays format
 * @param {string} calculation String of the calculation you would like performed. "Column" names MUST be within []. i.e. [DHB of Domicile]
 * @param {string} newColName The name of the column that the calculation will be within
 * @returns {array} The same data that came in but with an additional column with the name stated
 * 
 * @example
 * 
 * 
 * var current_waitlist = [
 *        ['waitlist_grouped', 'DHB_of_service'  , 'Compliant', 'NonCompliant', 'Total']
 *        ['FSA'             , 'Auckland'        , 17291      ,  305          , 17596  ]
 *        ['FSA'             , 'Counties Manukau', 10697      , 1999          , 12696  ]
 *        ['FSA'             , 'Northland'       ,  3931      , 3736          ,  7667  ]
 *        ['FSA'             , 'Waitemata'       , 12443      ,  673          , 13116  ]
 *        ['Treatment'       , 'Auckland'        ,  7094      , 1287          ,  8381  ]
 *        ['Treatment'       , 'Counties Manukau',  2912      ,  367          ,  3279  ]
 *        ['Treatment'       , 'Northland'       ,  1991      , 1715          ,  3706  ]
 *        ['Treatment'       , 'Waitemata'       ,  4431      , 1590          ,  6021  ]
 * ];
 * 
 * mutate(current_waitlist, '[Compliant] + [NonCompliant]', 'Total')
 * 
 * > [
 * >      ['waitlist_grouped', 'DHB_of_service'  , 'Compliant', 'NonCompliant', 'Total']
 * >      ['FSA'             , 'Auckland'        , 17291      ,  305          , 17596  ]
 * >      ['FSA'             , 'Counties Manukau', 10697      , 1999          , 12696  ]
 * >      ['FSA'             , 'Northland'       ,  3931      , 3736          ,  7667  ]
 * >      ['FSA'             , 'Waitemata'       , 12443      ,  673          , 13116  ]
 * >      ['Treatment'       , 'Auckland'        ,  7094      , 1287          ,  8381  ]
 * >      ['Treatment'       , 'Counties Manukau',  2912      ,  367          ,  3279  ]
 * >      ['Treatment'       , 'Northland'       ,  1991      , 1715          ,  3706  ]
 * >      ['Treatment'       , 'Waitemata'       ,  4431      , 1590          ,  6021  ]
 * > ];
 * 
 * // You can even skip the interim calculation and determine the percentage with:
 * mutate(current_waitlist, '[Compliant]/([Compliant] + [NonCompliant])', '% Compliant')
 * 
 * > [
 * >      ['waitlist_grouped', 'DHB_of_service'  , 'Compliant', 'NonCompliant', '% Compliant'     ],
 * >      ['FSA'             , 'Auckland'        , 17291      ,  305          , 0.982666515117072 ],
 * >      ['FSA'             , 'Counties Manukau', 10697      , 1999          , 0.8425488342785129],
 * >      ['FSA'             , 'Northland'       ,  3931      , 3736          , 0.5127168383983305],
 * >      ['FSA'             , 'Waitemata'       , 12443      ,  673          , 0.9486886245806648],
 * >      ['Treatment'       , 'Auckland'        ,  7094      , 1287          , 0.8464383725092471],
 * >      ['Treatment'       , 'Counties Manukau',  2912      ,  367          , 0.8880756328148826],
 * >      ['Treatment'       , 'Northland'       ,  1991      , 1715          , 0.5372369131138695],
 * >      ['Treatment'       , 'Waitemata'       ,  4431      , 1590          , 0.7359242650722472],
 * > ];
 * 
 * // And these functions can be chained together too
 * select(
 *       mutate(current_waitlist, '[Compliant]/([Compliant] + [NonCompliant])', '% Compliant')
 *     , ['waitlist_grouped', 'DHB_of_service', '% Compliant']
 * )
 * 
 * > [
 * >      ['waitlist_grouped', 'DHB_of_service'  , '% Compliant'     ],
 * >      ['FSA'             , 'Auckland'        , 0.982666515117072 ],
 * >      ['FSA'             , 'Counties Manukau', 0.8425488342785129],
 * >      ['FSA'             , 'Northland'       , 0.5127168383983305],
 * >      ['FSA'             , 'Waitemata'       , 0.9486886245806648],
 * >      ['Treatment'       , 'Auckland'        , 0.8464383725092471],
 * >      ['Treatment'       , 'Counties Manukau', 0.8880756328148826],
 * >      ['Treatment'       , 'Northland'       , 0.5372369131138695],
 * >      ['Treatment'       , 'Waitemata'       , 0.7359242650722472],
 * > ]; * 
 */
function mutate(df, calculation, newColName){
	var calculationArray = calculation.split(/[\[\]]/);
	let dfOut = [];
	dfOut.push(df[0].concat(newColName));
	for (let dfIndex = 1; dfIndex < df.length; dfIndex++) { // 1 skips the header file
		const dfRow = df[dfIndex];
		var expWithValues = [];
		for (let expindex = 0; expindex < calculationArray.length; expindex++) {
			var element = calculationArray[expindex];
			var colOrdinal = colNameToIndex(df, element);
			if (colOrdinal != -1) {
				element = dfRow[colOrdinal]; // this will be the row data
			}
			expWithValues = expWithValues.concat(element);
		}
		let calcedValue = eval(expWithValues.join(''));
		dfOut.push(dfRow.concat(calcedValue));
	}
	return dfOut;
}



function addColumn(df, dataToAdd, newColName){
	var dfLength = df.length;
	var dataAddLength = dataToAdd.length;
	// console.log(dataToAdd);
	let dfOut = [];
	if (dataAddLength == 1) {
		dfOut.push(df[0].concat(newColName));
		for (let dfIndex = 1; dfIndex < dfLength; dfIndex++) {
			const dfRow = df[dfIndex];
			dfOut.push(dfRow.concat(dataToAdd));
		}
		return dfOut
	}
	if (dataAddLength == dfLength -1) {// data only
		dfOut.push(df[0].concat(newColName));
		for (let dfIndex = 1; dfIndex < dfLength; dfIndex++) {
			const dfRow = df[dfIndex];
			dfOut.push(dfRow.concat(dataToAdd[dfIndex - 1]));
		}
		return dfOut
	}

	if (dataToAdd.length != 1 & df.length - 1 != dataToAdd.length) {
		console.log("Number of rows don't match or aren't a single value");
		return df
	}
}


// also allow desc
function orderBy(df, colToOrder, asc = 'asc') {
	// the array to be sorted
	let inarr = pull(df, colToOrder); // this already removes the header in the process
	// determine if we need custom sorting or not
	if(refCustomSortOrder[colToOrder]){
		// temporary array holds objects with position and sort-value
		mapped = inarr.map((v, i) => {
			return { i, value: refCustomSortOrder[colToOrder][v] };
		})
	} else {
	// Not a custom sort considering seeing if the values are string or numeric - see what happens
		mapped = inarr.map((v, i) => {
			return { i, value: v };
		})
	};
	// print(mapped);
	mapped.sort((a, b) => {
		if (a.value > b.value) {
		  return 1;
		}
		if (a.value < b.value) {
		  return -1;
		}
		return 0;
	});
	// let sorted =  mapped.map(v => inarr[v.i]);
	// return sorted;
	var header = df[0];
	// let sorted =  mapped.map(v => df[v.i]);

	sorted = [];
	for (let index = 0; index < mapped.length; index++) {
		var element = mapped[index];
		sorted[index] = df[element['i'] + 1];
	}
	sorted.unshift(header);
	return sorted
}


/*
var arr = [1,2,3,4];
var arr2 = [1,1,1,2];

var squares = arr.map((a, i) => a + arr2[i]);

Alternative
for(var i = 0; i < array1.length; i++){
	sum.push(array1[i] + array2[i]);
}


*/


/* References for sort

arr = [
  [12, 'Other']
, [102, 'Maori']
, [12, 'European']
, [28, 'Asian']
, [18, 'Pacific']
, [12, 'Maori']
, [18, 'Pacific']
, [28, 'Asian']
, [28, 'Other']
, [58, 'Asian']
, [68, 'Pacific']
, [78, 'Maori']];

//students.sort((firstItem, secondItem) => firstItem.grade - secondItem.grade);
arr.sort(function(a,b) {return b[0]-a[0]});

//Sort by numbers then by Ethnicity
arr.sort(function(a,b) {
	return a[0]-b[0]
});


// Trap for when there is no sort order - return 1, -1 or 0
arr.sort(function(a,b) {
	return sort_order[a[1]]-sort_order[b[1]]
});



// Sort by creating a separate array that contains the sort order

// the array to be sorted
inarr = ['Pacific', 'Other', 'European', 'Asian', 'Maori']

// temporary array holds objects with position and sort-value
mapped = inarr.map((v, i) => {
  return { i, value: sort_order[v] };
})

// sorting the mapped array containing the reduced values
mapped.sort((a, b) => {
  if (a.value > b.value) {
    return 1;
  }
  if (a.value < b.value) {
    return -1;
  }
  return 0;
});

result = mapped.map(v => inarr[v.i]);


if (typeof cols === 'string' || cols instanceof String) {
	cols = cols.split()
};

*/


// check of the columns exist
function sumMC(df, cols = [], colsToSum = []){
	if (cols.length == 0) {return df.length}
	let agg = [];
	
	let firstRow = [...cols].concat(colsToSum); // copy the values add sum columns
	// firstRow.push(colsToSum);
	agg.push(firstRow);
	
	let keepCols = colNamesToIndices(df, cols);
	let sumCols = colNamesToIndices(df, colsToSum);
	// console.log(sumCols);
	let dfLength = df.length;
	// for (let dfIndex = 1; dfIndex < 100; dfIndex++) {
	// for (let dfIndex = 1; dfIndex < df.length; dfIndex++) {
	for (let dfIndex = 1; dfIndex < dfLength; dfIndex++) {
		let dfRow = selectRow(df[dfIndex], keepCols);
		let dfSum = selectRow(df[dfIndex], sumCols);
		// console.log(df[dfIndex]);
		// console.log(dfRow);
		// console.log(cols);
		// console.log(dfSum);

		agg = sumAlreadyExistsMC(agg, dfRow, cols, dfSum);
	}
	return agg;
	}


function sumAlreadyExistsMC(dfKeepAgg, dfRow, cols, dfSum){
	let dfKeepAggLength = dfKeepAgg.length;
	for (let dfKeepIndex = 0; dfKeepIndex < dfKeepAggLength; dfKeepIndex++) {
		const keepRow = [...dfKeepAgg[dfKeepIndex]];
		let noOfCols = cols.length;
		if (areArraysTheSame(keepRow, dfRow, cols)) {
			for(var i = 0; i < dfSum.length; i++){
				// console.log(dfSum[i]);
				dfKeepAgg[dfKeepIndex][i + noOfCols] += dfSum[i];
			}
			return dfKeepAgg;
		} 
	}

	///dfRow.push(dfSum);
	dfRow = dfRow.concat(dfSum);
	
	dfKeepAgg.push(dfRow);
	return dfKeepAgg;
}

/**
 * @summary <h5>Summary:</h5> Alias replacement for console.log
 * 
 * @param {any} x Anything you would normally include in console.log
 */
function print(x) {
	console.log(x);
}


/**
 * @summary <h5>Summary:</h5> Extract a single "Column" without the header
 * @description Useful when you want to extract a column or single value
 * 
 * @param {array} df Dataframe in the array of arrays format
 * @param {string} colName Name of the column you want as an array
 * @returns {array} Array of the column without the header
 */
function pull(df, colName) {
	let out = [];
	let colNumber = colNameToIndex(df, colName);
	for (let index = 1; index < df.length; index++) { // skip the header
		const element = df[index][colNumber];
		out = out.concat(element);
	}
	return out
}





/*
function sumAlreadyExistsMC(dfKeepAgg, dfRow, cols, dfSum){
	let dfKeepAggLength = dfKeepAgg.length;
	for (let dfKeepIndex = 0; dfKeepIndex < dfKeepAggLength; dfKeepIndex++) {
	// for (let dfKeepIndex = 0; dfKeepIndex < dfKeepAgg.length; dfKeepIndex++) {
		const keepRow = [...dfKeepAgg[dfKeepIndex]];
		if (areArraysTheSame(keepRow, dfRow, cols)) {
			// var squares = arr.map((a, i) => a + arr2[i]);
			// dfKeepAgg[dfKeepIndex][noCols] += 1; // reference from count
			//Alternative
			let noOfCols = cols.length;
			for(var i = 0; i < dfSum.length; i++){
				dfKeepAgg[dfKeepIndex][i + noOfCols + 1] += dfSum[i]
				// use +=
				// sum.push(array1[i] + array2[i]);
				// dfKeepAgg[dfKeepIndex].push(tempsum);
			}
			// let tempsum = dfKeepAgg[dfKeepIndex].pop() + dfSum;
			// dfKeepAgg[dfKeepIndex].push(tempsum);
			// dfKeepAgg[dfKeepIndex].push(dfKeepAgg[dfKeepIndex].pop() + 1);
			// console.log(dfKeepAgg);
			return dfKeepAgg;
		} 
	}
	console.log(dfSum);
	console.log(dfRow);
	dfRow.concat(dfSum);
	dfKeepAgg.push(dfRow);
	console.log(dfKeepAgg);
	return dfKeepAgg;
}
*/
