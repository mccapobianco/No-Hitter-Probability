import pybaseball
import pandas as pd
import json
#projections from steamer
YEAR = 2021

def xOBP(WHIP):
	x = WHIP/(WHIP+3)
	return .9512*x

def xAVG(WHIP, BB9):
	x = (WHIP-BB9/9)/((WHIP-BB9/9)+3)
	return .9652*x

def xBF(WHIP, IP):
	return (WHIP+3)*IP

players = pd.read_csv('projections/ids.csv', encoding='latin')

for name in ['ZiPS', 'Steamer', 'Depth_Charts', 'ATC', 'THE_BAT']:
	print(name)
	#batters
	bProj = pd.read_csv('projections/csv/{0}/batter_{1}.csv'.format(YEAR, name))
	bProj = bProj[bProj['playerid'].apply(lambda x: str(x).isdigit())]
	# bProj['playerid'] = bProj['playerid'].astype(int)
	batters = pd.merge(bProj, players, left_on='playerid', right_on='fg_id')
	batters = batters.set_index('mlb_id')
	batters = batters[['Name', 'AVG', 'OBP', 'PA']].astype({'Name':str, 'AVG':float, 'OBP':float, 'PA':float})
	print(batters.head())
	batter_json = batters.to_json(orient="index")
	with open('projections/batter_{0}.json'.format(name), 'w') as f:
		f.write(batter_json)
	#pitchers
	pProj = pd.read_csv('projections/csv/{0}/pitcher_{1}.csv'.format(YEAR, name))
	pProj = pProj[pProj['playerid'].apply(lambda x: str(x).isdigit())]
	# pProj['playerid'] = pProj['playerid'].astype(int)
	pProj['OBP'] = xOBP(pProj['WHIP'])
	pProj['AVG'] = xAVG(pProj['WHIP'], pProj['BB/9'])
	pProj['PA'] = xBF(pProj['WHIP'], pProj['IP'])
	pitchers = pd.merge(pProj, players, left_on='playerid', right_on='fg_id')
	pitchers = pitchers.set_index('mlb_id')
	pitchers = pitchers[['Name', 'AVG', 'OBP', 'PA']].astype({'Name':str, 'AVG':float, 'OBP':float, 'PA':float})
	print(pitchers.head())
	pitcher_json = pitchers.to_json(orient="index")
	with open('projections/pitcher_{0}.json'.format(name), 'w') as f:
		f.write(pitcher_json)
	print('-'*50)