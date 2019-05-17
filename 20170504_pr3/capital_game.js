/*
    capital_game.js
    CS374, Intro. to HCI, PR3, 2019 Spring

    Made by Juan Lee (juanlee@kaist.ac.kr)
*/

//--------------------------------------------------
// CONSTANTS
const server_url = "https://s3.ap-northeast-2.amazonaws.com/ec2-54-144-69-91.compute-1.amazonaws.com/country_capital_pairs_2019.csv";
const base_map_url = "https://www.google.com/maps/embed/v1/place?key=AIzaSyDFsU-s1RI5ABA5bSN3QXtIDPiGY9E7N50&maptype=roadmap&language=en"
const db = firebase.database();
const accentMap = {
    "á": "a",
    "ö": "o",
    "ó": "o"
};

//--------------------------------------------------
// Only Code directly run when the page is loaded
$(document).ready(() => {
    // load pairs from the server
    fetch(server_url)
	.then(res => res.text())
	.then(res => {
        window.pairs = []
        var lines = res.split('\n');
        lines.shift();  // remove first row
        lines.forEach(line => {
            line = line.trim();

            var country = line.split(',')[0];
            var capital = line.split(',')[1];

            window.pairs.push({ country, capital });
        });
        // now window.pairs contains the list of country-capital pairs

        initialize();
	})
})

//--------------------------------------------------
// Initialize UI
var initialize = () => {
    initializeQuestion();
    initializeDB()
    handleEvents()
}

var initializeDB = () => {
    // initialize the list from DB
    db.ref('/pairs/').on('value', snapshot => {
        clearTable();
        if(snapshot.val() !== null){    // not empty
            var keys = Object.keys(snapshot.val());
            keys.forEach(key => {
                var submitted = snapshot.val()[key];

                // get submitted country-capital pairs
                var country = submitted.country;
                var capital = submitted.capital;

                addToTable(key, country, capital);
            })
        }
    })

    db.ref('/histories/').once('value', snapshot => {
        if(snapshot.val() !== null){
            $("#pr3__undo").removeAttr('disabled');
        }
    })
}

var initializeQuestion = () => {
    var rand = pairs[Math.floor(Math.random() * pairs.length)];
    $("#pr2__question").text(rand.country);
    $("#pr2__answer").val('');
    $("#pr2__answer").focus();

    $("iframe").attr('src', base_map_url + `&q=${rand.country}`);
}

var handleEvents = () => {
    $("#pr2__submit").click(() => addPair($("#pr2__question").text(), $("#pr2__answer").val()));
    $("#pr2__answer").keypress(e => {
        if(e.which === 13){
            addPair($("#pr2__question").text(), $("#pr2__answer").val());
        }
    });

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
		select: (event, ui) => {
            addPair($("#pr2__question").text(), ui.item.label);
            return false;
        }
    });
    
    $("#radio-all").click(()=>{
		$('.row-correct').show();
		$('.row-incorrect').show();

		filter_option='all';
	});
	$("#radio-correct").click(()=>{
		$('.row-correct').show();
		$('.row-incorrect').hide();

		filter_option='correct';
	});
	$("#radio-wrong").click(()=>{
		$('.row-correct').hide();
		$('.row-incorrect').show();

		filter_option='wrong';
    });
    
    $("#pr3__clear").click(()=>{
        clearPair()
    })

    // map
    setHoverEvent();

    $("#pr3__undo").click(() => {
        restoreRecent()
    });

    $("#pr3__reset").click(() => {
        db.ref('/').remove().then(() => {
            $("#pr3__reset").attr('disabled', true);
            $("#pr3__undo").attr('disabled', true);
            $("#pr3__clear").attr('disabled', true);
        })
    });
}

var setHoverEvent = () => {
    var timer;
    document.querySelectorAll("[hover]").forEach(elem => {
        elem.onmouseenter = () => {
            timer = setTimeout(() => {
                var location = elem.innerText;
                $("iframe")
                    .attr('src', base_map_url + `&q=${location}`)
                    .attr('style', 'border: 1px solid black');
            }, 1000);
        };

        elem.onmouseleave = () => {
            clearTimeout(timer);

            $("iframe")
                .attr('src', base_map_url + `&q=${$("#pr2__question").text()}`)
                .attr('style', 'border: 0');
        }
    })
}

var filter_option = 'all'; //global to store filter

//--------------------------------------------------
// Pair Manipulation
var addToTable = (key, country, capital) => {
    var result = solve(country, capital);
    var row = $(`<tr key="${key}"></tr>`)
        .append(`<td hover>${country}</td>`)
        .append(`<td>${result.result ? result.answer : "<del>" + capital + "</del>"}</td>`)
        .append(`<td hover>${result.answer}<input class="btn" type="button" value="delete" onclick="deletePair('${key}')"></input></td>`)
        .attr('class', result.result ? 'row-correct' : 'row-incorrect');
    $("#answer-form").after(row);
    setHoverEvent();

    if((result.result && filter_option === "wrong") || (!result.result && filter_option === "correct")){
        $("#radio-all").click();
    }

    $("#pr3__clear").removeAttr('disabled');
}

var addPair = (country, capital) => {
    storeSnapshot().then(() => {
        var ref = db.ref('/pairs/').push({
            country, capital
        });
        //addToTable(ref.key, country, capital);
    
        // initialize question
        initializeQuestion();
    })
}

var deleteFromTable = key => {
    $(`tr[key="${key}"]`).remove();
}

var deletePair = key => {
    storeSnapshot().then(() => {
        deleteFromTable(key);
        db.ref(`/pairs/${key}`).remove().then(() => {
            if($(".row-correct").length + $(".row-incorrect").length === 0){
                $("#pr3__clear").attr('disabled', true);
            }
        })
    })
}

var clearTable = () => {
    $(".row-correct").remove();
    $(".row-incorrect").remove();
}

var clearPair = () => {
    storeSnapshot().then(() => {
        clearTable();
        db.ref('/pairs/').remove().then(() => {
            if($(".row-correct").length + $(".row-incorrect").length === 0){
                $("#pr3__clear").attr('disabled', true);
            }
        })
    })
}

var storeSnapshot = () => {
    $("#pr3__undo").removeAttr('disabled');
    $("#pr3__reset").removeAttr('disabled');

    var timestamp = Date.now();
    return db.ref('/pairs/').once('value', snapshot => {
        if(snapshot.val() !== null){    // not empty
            var keys = Object.keys(snapshot.val());
            keys.forEach(key => {
                var pair = snapshot.val()[key];
                db.ref(`/histories/${timestamp}/${key}`).set(pair);
            })
        } else {
            db.ref(`/histories/${timestamp}`).set({
                initial: true
            })
        }
    })
}

var restoreRecent = () => {
    db.ref('/histories').once('value', snapshot => {
        if(snapshot.val() !== null){    // not empty
            var keys = Object.keys(snapshot.val());
            keys.sort();
            var recent = keys[keys.length - 1];

            db.ref('/pairs/').remove().then(() => {
                db.ref(`/histories/${recent}`).once('value', tocopy => {
                    if(tocopy.val() !== null){
                        if(tocopy.val().initial){
                            db.ref(`/pairs/`).remove().then(() => {
                                $("#pr3__undo").attr('disabled', true);
                                $("#pr3__reset").attr('disabled', true);
                                if($(".row-correct").length + $(".row-incorrect").length === 0){
                                    $("#pr3__clear").attr('disabled', true);
                                }
                            })
                        }
                        else {
                            var pairs_keys = Object.keys(tocopy.val());
                            pairs_keys.forEach(pair_key => {
                                db.ref(`/pairs/${pair_key}`).set(tocopy.val()[pair_key]);
                            })

                            if(pairs_keys.length > 0){
                                $("#pr3__clear").removeAttr('disabled');
                            }
                            else {
                                $("#pr3__clear").attr('disabled', true);
                            }
                        }
                    }
                }).then(() => {
                    db.ref(`/histories/${recent}`).remove();
                })
            })
        }
    }).then(() => {
        initializeDB();
    })
}

//--------------------------------------------------
// Problem Manipulation
var solve = (country, given) => {
	// reflect the pairs of accent map
	var normalize = function( term ) {
		var ret = "";
		for ( var i = 0; i < term.length; i++ ) {
			ret += accentMap[ term.charAt(i) ] || term.charAt(i);
		}
		return ret;
	};

	var country_capital_pairs = pairs;
    country_capital_pairs = country_capital_pairs.filter(pair => pair.country === country);
    var answer = country_capital_pairs[0].capital;

	return {
		result: given.toLowerCase() === answer.toLowerCase() || given.toLowerCase() === normalize(answer).toLowerCase(),
		answer
	};
}