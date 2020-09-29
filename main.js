const LEAGUE_AVG = 0.240;
const LEAGUE_OBP = 0.320;
const LEAGUE_FLD = 0.985;
const AUTO_REFRESH = 10000000;
var BATTER_PROJECTIONS = {};
var PITCHER_PROJECTIONS = {};
var INTERVAL;

function today(){
	let today = new Date();
	today.setMinutes(today.getMinutes() + (-12*60+today.getTimezoneOffset())); //normalize timezone
	let dd = String(today.getDate()).padStart(2, '0');
	let mm = String(today.getMonth() + 1).padStart(2, '0');
	let yyyy = today.getFullYear();
	return {'dd':dd, 'mm':mm, 'yyyy':yyyy};
}

function today_link(){
	let date = today();
	return `https://gd2.mlb.com/components/game/mlb/year_${date.yyyy}/month_${date.mm}/day_${date.dd}/master_scoreboard.json`;
}

function PP(home, game){
	let ha = home ? "home" : "away";
	let pp = game[`${ha}_probable_pitcher`];
	if (pp.id == "")
		return "TBD";
	return `${pp.first} ${pp.last}`;
}

function main(){
	let link = today_link();
	// link = "https://gd2.mlb.com/components/game/mlb/year_2015/month_06/day_20/master_scoreboard.json" //scherzer
	// link = "https://gd2.mlb.com/components/game/mlb/year_2012/month_08/day_15/master_scoreboard.json" //felix
	// link = "https://gd2.mlb.com/components/game/mlb/year_2019/month_07/day_12/master_scoreboard.json" //skaggs
	$.get(link, 
		function(data){
			let games = data.data.games.game;
			let odds = {};
			for (let i = 0; i < games.length; i++) {
				let game = games[i];
				let home = game.home_name_abbrev;
				let away = game.away_name_abbrev;
				if (game.status.status == "Postponed"){
					if (game.game_nbr == 1){
						document.getElementById(away).innerHTML = `${away}- ${game.status.status}`;
						document.getElementById(home).innerHTML = `${home}- ${game.status.status}`;
					}
				} else if (game.status.status == 'In Progress'){
					if (game.linescore.h.home > 0){
						display(false, {"nh":0, "pg":0}, game);
					} else {
						get_calc_and_display(game, false);
					}
					if (game.linescore.h.away > 0){
						display(true, {"nh":0, "pg":0}, game);
					} else {
						get_calc_and_display(game, true);
					}
				} else if (["Pre-Game", "Preview", "Warmup"].includes(game.status.status)){
					if (game.game_nbr == 1){
						let gametime = `${game.time} ${game.time_zone}`;// | <a href=${game2link(game)}>${game.status.status}</a>`
						document.getElementById(away).innerHTML = `${away}- (${PP(false, game)} \u2022 <a href=${game2link(game)}>@${home}</a>) | ${gametime}`;
						document.getElementById(home).innerHTML = `${home}- (${PP(true, game)} \u2022 <a href=${game2link(game)}>${away}</a>) | ${gametime}`;
					}
				} else if (["Final", "Game Over"].includes(game.status.status)){
					let home_nh = game.linescore.h.away == 0;
					let away_nh = game.linescore.h.home == 0;
					let pg = game.status.is_perfect_game == "Y";
					display(false, {"nh":away_nh, "pg":away_nh&&pg}, game);
					display(true, {"nh":home_nh, "pg":home_nh&&pg}, game);
				} else { 
					document.getElementById(away).innerHTML = `${away}- (${PP(false, game)} \u2022 <a href=${game2link(game)}>@${home}</a>) | ${game.status.status}`;
					document.getElementById(home).innerHTML = `${home}- (${PP(true, game)} \u2022 <a href=${game2link(game)}>${away}</a>) | ${game.status.status}`;
				}
			}
			// dummy_display()
		});
}

function get_calc_and_display(game, home){
	let status = perfect_status(game);
	$.get(`https://statsapi.mlb.com/api/v1/game/${game.game_pk}/boxscore`, 
		function(boxscore){
			let top = game.status.top_inning == 'Y' ? 'Top' : 'Bottom';
			let inning = `${top} ${game.status.inning}`
			if (status.Y) //know it is a perfect game
				display(home, calculate(boxscore, true, home), game, boxscore);
			else if (status.N) //know it isn't a perfect game 
				display(home, {"nh":calculate_nh(boxscore, home), "pg":0}, game, boxscore);
			else //unknown based on game status
				display(home, calculate(boxscore, false, home), game, boxscore);}); 
	}

function game2link(game){
	return `https://www.mlb.com/gameday/${game.gameday}`;
}


function get_icons(home, game, boxscore=null){
	let top = game.status.top_inning == 'Y';
	let base_state = Object.keys(game.runners_on_base);
	let bases = 1*base_state.includes('runner_on_1b')+2*base_state.includes('runner_on_2b')+4*base_state.includes('runner_on_3b');
	let outs = game.status.o;
	if (outs == 3)
		outs = 2;
	if (boxscore != null){
		let ha = home ? 'home' : 'away';
		let IP = boxscore['teams'][ha]['teamStats']['pitching']['inningsPitched'];
		outs = IP.split('.')[1];
	}
	return top == home ? ` <img src="icons/bases${bases}.jpg" alt="" width="20" height="20" style="vertical-align:bottom"> <img src="icons/outs${outs}.jpg" alt="" width="10" height="20" style="vertical-align:bottom"> ` : "";					
}

function display(home, odds, game, boxscore=null){
	let ha = home ? 'home' : 'away';
	let oppha = home ? 'away' : 'home';
	let symbol = home ? '' : '@';
	let team = game[`${ha}_name_abbrev`];
	let opponent = game[`${oppha}_name_abbrev`];
	let score = `${game['linescore']['r'][ha]}-${game['linescore']['r'][oppha]}`;
	let status = '';
	let link = game2link(game);
	let icon = "";
	if (['Final', 'Game Over'].includes(game.status.status)){
		status = 'Final';
	}
	else {
		let top = game.status.top_inning == 'Y' ? 'Top' : 'Bottom';
		status = `${top} ${game.status.inning}`;
		icon = get_icons(home, game, boxscore);
	}
	let pitcher = game_pitcher(home, game);
	let is_combined = "";
	if (boxscore != null){
		if(combined(boxscore, home))
			is_combined = " (<i>Combined</i>)";
	}
	if (odds.nh == 1){
		$.get(`https://statsapi.mlb.com/api/v1/game/${game.game_pk}/boxscore`, 
			function(boxscore){
				if(combined(boxscore, home))
					is_combined = " (<i>Combined</i>)";
				str = `<b>${team}- (${pitcher}${is_combined} \u2022 <a href=${link}>${symbol}${opponent}</a>) | No-hitter: ${parse_percent(odds.nh)} | Perfect game: ${parse_percent(odds.pg)} [${score}, ${status}${icon}]</b>`;
				document.getElementById(team).innerHTML = str;
			});
	} else { 
		let str = `${team}- (${pitcher}${is_combined} \u2022 <a href=${link}>${symbol}${opponent}</a>) | No-hitter: ${parse_percent(odds.nh)} | Perfect game: ${parse_percent(odds.pg)} [${score}, ${status}${icon}]`;
		if (odds.nh > 0)
			str = `<u>${str}</u>`;
		document.getElementById(team).innerHTML = str;
	}	
}


function sum_baserunners(bStats){
	return bStats.runs+bStats.caughtStealing+bStats.pickoffs+bStats.groundIntoDoublePlay+2*bStats.groundIntoTriplePlay+bStats.leftOnBase;
}

function perfect_status(game){
		if (game.status.is_perfect_game == "Y"){
			return {"Y":true, "N":false};
		}
		if (game.status.is_perfect_game == "N" && game.status.is_no_hitter == "Y"){
			return {"Y":false, "N":true};
		}
		return {"Y":false, "N":false};
}

function calculate(boxscore, known_pg=true, home=true){
	let nh = calculate_nh(boxscore, home);
	let pg = calculate_pg(boxscore, known_pg, home);
	return {"nh":nh, "pg":pg};
}

function calculate_pg(boxscore, known=true, home=true){
	let bStats = home ? boxscore.teams.away.teamStats.batting : boxscore.teams.home.teamStats.batting;
	let pStats = home ? boxscore.teams.home.teamStats.pitching : boxscore.teams.away.teamStats.pitching;
	let IP = pStats.inningsPitched;
	IP = Math.floor(IP)+(IP-Math.floor(IP))/0.3;
	let baserunners = sum_baserunners(bStats);
	if (!known){
		if (pStats.battersFaced == undefined)
			pStats.battersFaced = 0;
		if (pStats.battersFaced != Math.round(IP*3) || baserunners != 0){
			return 0;
		}
	}
	let outs_rem = 27-Math.round(IP*3);
	let xlineup = xStats_lineup(boxscore, home);
	let batter = 8;
	let prob = 1;
	for (let outs = outs_rem; outs > 0; outs--){
		prob *= xlineup[batter].Out;
		batter = (batter + 8) % 9;
	}
	return prob;

}

function calculate_nh(boxscore, home=true){
	let bStats = home ? boxscore.teams.away.teamStats.batting : boxscore.teams.home.teamStats.batting;
	let pStats = home ? boxscore.teams.home.teamStats.pitching : boxscore.teams.away.teamStats.pitching;
	let IP = pStats.inningsPitched;
	IP = Math.floor(IP)+(IP-Math.floor(IP))/0.3;
	let outs_pitched = Math.round(3*IP);
	let outs_rem = 27-outs_pitched;
	let xlineup = xStats_lineup(boxscore, home);
	let array = [];
	let max_walks = 32;
	for (let i = 0; i <= outs_rem; i++){
		let row = [];
		for (let j = 0; j <= max_walks; j++){
			row.push(0);
		}
		array.push(row);
	}
	array[0][0] = 1;
	for (let outs = 0; outs < outs_rem; outs++){
		for (let runners = 0; runners < max_walks; runners++){
			let current_batter = xlineup[(outs+runners+bStats.plateAppearances)%9];
			// let outcomes = stats2outcomes(current_batter.avg, current_batter.obp);
			array[outs+1][runners] += array[outs][runners]*current_batter.Out;
			array[outs][runners+1] += array[outs][runners]*current_batter.BB;
		}
	}
	let prob = 0;
	for (let i=0; i < max_walks; i++){
		prob += array[outs_rem][i];
	}
	return prob;
}

function hit_rate(avg, obp){
	return avg*(1-obp)/(1-avg);
}

function stats2outcomes(avg, obp){
	phit = hit_rate(avg, obp);
	return {"Out":1-obp, "BB":obp-phit};
}	

function parse_percent(decimal){
	let str = `${100*decimal}`;
	if (str.length > 6)
		str = str.slice(0,6);
	return `${str}%`;
}

function round_odds(odds){
	if (odds >= 100){
		return Math.round(odds);
	}
	if (odds >= 10){
		return `${Math.round(10*odds)/10}`.slice(0,4);
	}
	else {
		return `${Math.round(100*odds)/100}`.slice(0,4);
	}
}

function log5(x, y, l_avg){
	x = parseFloat(x);
	y = parseFloat(y);
	l_avg = parseFloat(l_avg);
	let a = (x*y/l_avg);
	let b = (1-x)*(1-y)/(1-l_avg);
	return a/(a+b);
}

function regress(val, mean, pa, C=500){
	return (val*pa + mean*C)/(pa+C)
}

//a lineup's expected performance level against a certain pitcher
function xStats_lineup(boxscore, home=true){ //lineup is array of dicts {avg:x, obp:y}
		let home_pitcher = home ? "home" : "away";
		let home_lineup = home ? "away" : "home";
		let lineup_ids =  boxscore['teams'][home_lineup]['battingOrder'];
		let xlineup = [];
		let used_pitchers = boxscore['teams'][home_pitcher]['pitchers'];
		let pitcher = id2stats(used_pitchers[used_pitchers.length-1], boxscore, false, true, home);
		for (let i = 0; i < 9; i++){
			let batter = id2stats(lineup_ids[i], boxscore, true, true, home);
			let avg = log5(batter.avg, pitcher.avg, LEAGUE_AVG);
			let bb = log5(batter.obp-hit_rate(batter.avg, batter.obp), pitcher.obp-hit_rate(pitcher.avg, pitcher.obp), LEAGUE_OBP-hit_rate(LEAGUE_AVG, LEAGUE_OBP));
			let obp = log5(batter.obp, pitcher.obp, LEAGUE_OBP)
			// if (pitcher.atBats == 0){
			// 	avg = LEAGUE_AVG;
			// 	bb = LEAGUE_OBP	- hit_rate(LEAGUE_AVG, LEAGUE_OBP);
			// } //TODO fix
			bb = bb/LEAGUE_FLD;
			xlineup.push({'Out':(1-obp), 'BB':bb});
		}
		return xlineup;
}

function id2stats(playerid, boxscore, batter=true, use_regress=true, home=true){
	let proj = batter ? BATTER_PROJECTIONS[`${playerid}`] : PITCHER_PROJECTIONS[`${playerid}`];
	let ha = home != batter ? "home" : "away";
	let bp = batter ? "batting" : "pitching";
	let player = boxscore["teams"][ha]["players"][`ID${playerid}`]['seasonStats'][bp];
	let has_at_bats = true;
	if (!batter){
		if (player.atBats == 0){
			player.avg = 0;
			player.plateAppearances	=0;
		} else {
		player.avg = player.hits/player.atBats;
		player.plateAppearances = player.atBats+player.baseOnBalls+player.hitByPitch;
			}
	}
	if (typeof proj === 'undefined' || !has_at_bats	){
		proj = {};
		proj.AVG = LEAGUE_AVG;
		proj.OBP = LEAGUE_OBP;
	}
	player.avg = regress(player.avg, proj.AVG, player.plateAppearances, 750);
	player.obp = regress(player.obp, proj.OBP, player.plateAppearances, 750);
	return player;
}

function final_pitcher(home, game){
	let runs = game.linescore.r;
	let home_w = parseInt(runs.home) > parseInt(runs.away);
	let pitcher = home_w == home ? game.winning_pitcher : game.losing_pitcher;
	return `${pitcher.first} ${pitcher.last}`;
}

function game_pitcher(home, game){
	if (["Game Over", "Final"].includes(game.status.status)){
		return final_pitcher(home, game);
	}
	let on_mound = (game.status.top_inning == 'Y') == home;
	let pitcher = on_mound ? game.pitcher : game.opposing_pitcher;
	return `${pitcher.first} ${pitcher.last}`;
}

function combined(boxscore, home) {
	let home_pitcher = home ? "home" : "away";
	let pitchers = boxscore['teams'][home_pitcher]['pitchers'];
	return pitchers.length > 1;
}

function on_pause_click(){
	clearInterval(INTERVAL);
	var style = document.getElementById('pause').style.display;
	document.getElementById('pause').style.display = 'none';
	document.getElementById('continue').style.display = 'inline';
	document.getElementById('refresh_label').innerHTML = '* <b>PAUSED.</b> This page will auto-update every 10 seconds.'
}

function on_continue_click(){
	document.getElementById('pause').style.display = 'inline';
	document.getElementById('continue').style.display = 'none';
	document.getElementById('refresh_label').innerHTML = '* This page will auto-update every 10 seconds.'
	INTERVAL = setInterval(main, AUTO_REFRESH);
}

$.get(`https://raw.githubusercontent.com/mccapobianco/No-Hitter-Probability/master/projections/pitcher_Steamer.json`, 
	function(p){
		PITCHER_PROJECTIONS = JSON.parse(p);
		$.get(`https://raw.githubusercontent.com/mccapobianco/No-Hitter-Probability/master/projections/batter_Steamer.json`, 
			function(b){
				BATTER_PROJECTIONS = JSON.parse(b);
				main();
				INTERVAL = setInterval(main, AUTO_REFRESH);
			}
		);
	}
);

//TODO double plays, caught stealing, extra innings, runs scored