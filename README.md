# No-Hitter-Probability

:baseball: See this project on [GitHub pages](https://mccapobianco.github.io/No-Hitter-Probability/) :baseball:

The data used to make these calculations is obtained from 2 APIs: [MLB Gameday](https://gd2.mlb.com/components/game/mlb/) and [MLB Stats API](https://statsapi.mlb.com/). The data is used to create a list of batting averages and on-base percentages that the batters are expected to have against the current pitcher. This list will be refered to as the `xlineup` and represented by a list of nine ordered pairs, where the values in each pair are `Out%` (the percent of plate appearances resulting in outs) and `BB%` (the percent of plate appearance resulting in walks). For simplicity, a _HBP_ is considered a type of _BB_ The notation ![](https://latex.codecogs.com/png.latex?\pi^n_m(xlineup)) represents the _m_ statistic of the _nth_ batter. The number of outs remaining and the current or due-up batter are also important pieces of data.

## Calculating a Perfect Game

The probability of a perfect game is the probability that all remaining batters get out. Therefore, with `outs` representing the number of outs recorded, the probability of a perfect game is the product of the probabilities of each batter:

![](https://latex.codecogs.com/png.latex?P('PG')=\prod_{n=outs+1}^{27}[{1-\pi^{n\pmod9+1}_{'out%25'}(xlineup)])

## Calculating a No-Hitter

The probability of a no-hitter is a bit more complex. There is a chance of a no-hitter with 0 baserunners, with 1 baserunners, with 2 baserunners, etc. For a no-hitter with _n_ baserunners, there are _27^n_ permutations for the order of outs and baserunners. To account for every possibility, the program uses a 2D-array. The row number represents the number of outs and the column number represents the number of baserunners. The table is limited to 32 columns, and he first column and row have an index of 0. Although more baserunners are theoretically possible, the probability of this is so small that it is negligible. The notation `array[X][Y]` represents the cell in row _X_ and column _Y_. The value in `array[X][Y]` is the probability that the game reaches _X_ outs with no hits and _Y_ baserunners. The array is initialized by setting the cell representing the current situation equal to 1. Then, values are passed from cell to cell. Iteratively set cells using the following formulas:

- ![](https://latex.codecogs.com/png.latex?array[x][y]=array[x][y]+array[x-1][y]*\pi^{(x+y-1)\pmod9+1}_{'out%25'}(xlineup))
- ![](https://latex.codecogs.com/png.latex?array[x][y]=array[x][y]+array[x][y-1]*\pi^{(x+y-1)\pmod9+1}_{'bb%25'}(xlineup))


Below is an example of an array with 2 rows and 2 columns, where `Out%`=0.7 and `BB%`=0.1:

|   |        |                   |
|---|--------|-------------------|
|   |[ P = 1      ]|[ P = 1\*0.1            ]|
|   |[ P = 1\*0.7 ]|[ P = 0.7\*0.1+0.1\*0.7 ]|

After this process fills the entire array, `array[27]` will contain the probabilities of reaching the end of the game without allowing a hit for each number of baserunners. Simply sum this row to get the probability of a no-hitter.



## xLineup
### Expected future performance
The first step in creating the `xlineup` is to calculate the batters' and pitcher's expected batting average and on-base percentage for future plate appearances. With small sample sizes, a player's statistics can be wildly different than their true performance level. For example, if a pitcher does not allow a hit in his first appearance of the season, his .000 batting average against would imply that a no-hitter his following performance is certain. For a more realistic value, a player's season statistics are regressed to their projected season statistics.
#### Regression to the Mean
Regression to the mean is used to explain how larger sample sizes will be closer to an expected value than some small samples. This can be done by adding a fixed number of average values to the sample. The larger the real sample, the more reliable it is. Since some players have a higher average performance than others, the expected value for a player is their projected season statistics.
#### Projections
[Fangraphs](https://www.fangraphs.com/projections.aspx?pos=all&stats=bat&type=steamer&team=0&lg=all&players=0) has multiple projection systems available. This program uses the Steamer projections. One issue is that the pitching projections do not have a batting average against nor a on-base percentage against. Using the provided stats `WHIP` and `BB/9`, I created estimations for `AVG` and `OBP` with strong correlations. My initial estimations were `estOBP = WHIP/(WHIP+3)` and `estAVG = (WHIP-BB9/9)/((WHIP-BB9/9)+3)`, but I found these did not quite have a slope of 1 when plotted against their actual statistics, so I multiply these each by a constant:  `estOBP = 0.9512*WHIP/(WHIP+3)` and `estAVG = 0.9652*(WHIP-BB9/9)/((WHIP-BB9/9)+3)`.

### Head-to-Head Matchup
The next step in creating the `xlineup` is to find the batter's predicted satistics against a certain pitcher. A simple way to do this is using [Bill James's Log5 formula](https://sabr.org/journal/article/matchup-probabilities-in-major-league-baseball). `P = (xy/z) / (xy/z+(1-x)(1-y)/(1-z))`, where _x_ is the batter's stats, _y_ is the pitcher's stats, and _z_ is the league average stat. This formula is used to get the estimated _AVG_ and estimated _OBP_ in a given matchup.

### Statistics to Outcomes
The probability of an out and the probability of a walk (or hit-by-pich) must be calculated from the _AVG_ and _OBP_. The P('out'), or `Out%`, is simple; `1-OBP`. The P('walk'), or `BB%`, is a little more complex. This is `OBP-P('hit')`. Notice that _AVG_ does not equal P('hit'); `AVG=P('hit' | 'at-bat')`, while we want `P('hit' | 'plate appearance')`. I found that `P('hit')=AVG*(1-OBP)/(1-AVG)`. So `BB% = OBP-AVG*(1-OBP)/(1-AVG)`. A chance of an error `1-FLD%` is added to the `BB%`, where `FLD%` is the league-wide fielding percentage. 

## Future work
The following aspects are not currently considered in the calculations, but could be considered in the future:
- Double plays
- Caught stealing/stolen bases
- Extra innings/scoring runs
- Pitcher fatigue
- Team specific fielding percentage
- Count-adjusted statistics
- Other head-to-head formulas
- "Hot/Cold" (e.g. if a pitcher hasn't allowed a hit through 7 innings, they are likely performing better than their average, but the calculation uses their season averages)

I also plan to add more detailed information to the user interface, including:
- Pitcher name
- Opponent
- Score
- Inning
- Baserunners
- Outs
- Current/due-up batter
