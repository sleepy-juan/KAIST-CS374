// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.

var initialize = () => {
	var country_capital_pairs = pairs;
	var rand_country = country_capital_pairs[Math.floor(Math.random() * country_capital_pairs.length)];

	$("#pr2__question").text(rand_country.country);
	$("#pr2__answer").val('');
	$("#pr2__answer").focus();
}

var match = (country, given) => {
	var country_capital_pairs = pairs;
	country_capital_pairs = country_capital_pairs.filter(pair => pair.country === country);
	var answer = country_capital_pairs[0].capital;

	return {
		result: given.toLowerCase() === answer.toLowerCase(),
		answer
	};
}

var submit_index = 0;
var submitted = (selected) => {
	var country = $("#pr2__question").text();
	var answer = selected || $("#pr2__answer").val();
	var result = match(country, answer);
	var row = $(`<tr index="${submit_index}"></tr>`);

	if(result.result){
		row.attr('class', 'row-correct');
		row.append(`<td>${country}</td>`).append(`<td>${result.answer}</td>`).append(`<td><i class="fas fa-check"></i><input class="btn" type="button" value="delete" onclick="onDelete('${submit_index}')"></input></td>`);

		if(filter_option === "wrong")
			$("#radio-all").click();
	}
	else {
		row.attr('class', 'row-incorrect');
		row.append(`<td>${country}</td>`).append(`<td><del>${answer}</del></td>`).append(`<td>${result.answer}<input class="btn" type="button" value="delete" onclick="onDelete('${submit_index}')"></input></td>`);

		if(filter_option === "correct")
			$("#radio-all").click();
	}
	$("#answer-form").after(row);

	submit_index++;

	initialize();
}

var onDelete = (what) => {
	$(`tr[index = "${what}"]`).remove();
}

var filter_option = 'all';
$( document ).ready(function() {
	initialize();

	$("#pr2__submit").click(() => submitted());
	$("#pr2__answer").keypress(e => {
		if(e.which === 13){
			submitted();
		}
	});

	var accentMap = {
		"á": "a",
		"ö": "o"
	};
	var normalize = function( term ) {
		var ret = "";
		for ( var i = 0; i < term.length; i++ ) {
			ret += accentMap[ term.charAt(i) ] || term.charAt(i);
		}
		return ret;
	};

	$("#pr2__answer").autocomplete({
		source: (request, response) => {
			var country_capital_pairs = pairs;
			var capitals = country_capital_pairs.map(pair => pair.capital);

			var matcher = new RegExp( $.ui.autocomplete.escapeRegex( request.term ), "i" );
			response( $.grep( capitals, function( value ) {
				value = value.label || value.value || value;
				return matcher.test( value ) || matcher.test( normalize( value ) );
			}));
		},
		select: (event, ui) => submitted(ui.item.label)
	});

	$("#radio-all").click(()=>{
		$('.row-correct').show();
		$('.row-incorrect').show();

		filter_option='all';
	})
	$("#radio-correct").click(()=>{
		$('.row-correct').show();
		$('.row-incorrect').hide();

		filter_option='correct';
	})
	$("#radio-wrong").click(()=>{
		$('.row-correct').hide();
		$('.row-incorrect').show();

		filter_option='wrong';
	})
});
