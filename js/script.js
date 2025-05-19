//script for "Share of Billionaires Net Worth Over Time in the US" graph

const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 1200 - margin.left - margin.right;
const height = 1000 - margin.top - margin.bottom;


Billpath = 'data/billionaires_fixed.csv'
allData = []
originalData = []
options = ['nominal', 'normalized']
type = options[1]
dataSourceLink = "https://www.kaggle.com/datasets/guillemservera/forbes-billionaires-1997-2023"; 
dataSourceText = "Source: Forbes Billionaire Evolution"; 

contributionData = [
  {
    "year": 1990,
    "contributions": 1
  },
  {
    "year": 1992,
    "contributions": 3
  },
  {
    "year": 1994,
    "contributions": 2
  },
  {
    "year": 1996,
    "contributions": 3
  },
  {
    "year": 1998,
    "contributions": 2
  },
  {
    "year": 2000,
    "contributions": 18
  },
  {
    "year": 2002,
    "contributions": 16
  },
  {
    "year": 2004,
    "contributions": 13
  },
  {
    "year": 2006,
    "contributions": 12
  },
  {
    "year": 2008,
    "contributions": 16
  },
  {
    "year": 2010,
    "contributions": 31
  },
  {
    "year": 2012,
    "contributions": 231
  },
  {
    "year": 2014,
    "contributions": 231
  },
  {
    "year": 2016,
    "contributions": 682
  },
  {
    "year": 2018,
    "contributions": 611
  },
  {
    "year": 2020,
    "contributions": 2632
  }
];

// Create SVG
const svg = d3.select('#BillVis')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

const Csvg = d3.select('#Contribution-Viz')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

function parseIndustry(d) {
    if (d.business_industries.replace(/[\[\]']/g, "").trim() === "Technology") {
        return "Technology"
    } else {
        return "Other"
    }
}
function convertTypes(d) {
    const parseDate = d3.timeParse("%Y");
    return {
        year: parseDate(d.year).getFullYear(),
        name: d.full_name,
        net_worth: parseFloat(d.net_worth),
        gender: d.gender,
        country: d.country_of_citizenship,
        industry: parseIndustry(d)
    }
}

//used to select normalized or nominal option for charts
function setupBillSelector(){
    const selector = d3.select('.form-select')

    selector
        .selectAll('myOptions')
        .data(options)
        .enter()
        .append('option')
        .text(d => d) 
        .attr("value",d => d)

    selector
        .on("change", function (event) {
            let newVar = d3.select(this).property("value")
            type = newVar

            //remove old visualization and redraw 
            d3.select("#BillVis svg")
                .selectAll('*') 
                .remove()

            createBillVis()
        })
    d3.select('#format').property('value', type)
}

//create series used for stacked charts
function createSeries(data) {
    series = 0
    if (type === "nominal") {
        series = d3.stack()
            .keys([...new Set(data.map(d => d.industry))].sort(d3.descending))
            .value(([, group], key) => {if (group.get(key)) { return group.get(key)['total_net_worth']} else { return 0}})
            (d3.index(data, d => d.year, d => d.industry))
    } else {
        series = d3.stack()
            .keys([...new Set(data.map(d => d.industry))].sort(d3.descending))
            .value(([, group], key) => {if (group.get(key)) { return group.get(key)['total_net_worth']} else { return 0}})
            .offset(d3.stackOffsetExpand)
            (d3.index(data, d => d.year, d => d.industry))
    }
    
    return series
}

//chart for political contribution chart 
function createContributionVis() {

    //set up scales 
    const x = d3.scaleBand()
        .domain(contributionData.map(function(d) { return d.year; }))
        .range([margin.left, width - margin.right])
        .padding(0.1)
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(contributionData, function(d) { return d.contributions; })])
        .rangeRound([height, 100])


    Csvg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))

    Csvg.append("g")
        .attr("transform", `translate(${margin.left},${-margin.bottom})`)
        .call(d3.axisLeft(y).ticks(10))
        .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Contributions")

    Csvg.append("text")
        .attr("x", width / 2) 
        .attr("y", height - 20) 
        .text("Year")
        .attr("text-anchor", "middle") 
        .style("fill", "black")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")

    Csvg.append("text")
        .attr("transform", "rotate(-90)") 
        .attr("y", 0 + 30)
        .attr("x", 0 - (height / 2)) 
        .text("Contributions (in Millions USD")
        .attr("text-anchor", "middle") 
        .style("fill", "black")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")

    Csvg.append("text")
        .text("Political Donations in the US")
        .attr("x", 520)  
        .attr("y", 50)   
        .attr("text-anchor", "middle") 
        .style("fill", "black")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")


    //create bar chart
    Csvg.append("g")
        .attr("transform", `translate(0,${-margin.bottom})`)
        .selectAll(".bar")
        .data(contributionData)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d.year); })
            .attr("y", function(d) { return y(d.contributions); })
            .attr("width", x.bandwidth())
            .attr("height", function(d) { return height - y(d.contributions); })
            .attr("fill", "#04672b")

    //labels on top of bars
    Csvg.selectAll(".bar-text")
        .data(contributionData)
        .enter()
        .append("text")
        .attr('font-size', '10px')
        .attr("class", "bar-text")
        .attr("text-anchor", "middle") 
        .attr("x", function(d) { return x(d.year) + x.bandwidth() / 2}) 
        .attr("y", function(d) { return y(d.contributions) - 5 - margin.bottom }) 
        .text(function(d) { return d.contributions; }); 


    //add clickable source
    link = Csvg.append("a")
        .attr("xlink:href", "https://americansfortaxfairness.org/billionaires-spending-39-times-federal-elections-since-citizens-united-supreme-court-decision-2010/") 
        .attr("target", "_blank")


    link.append("text")
        .text("Election Contribution Data")
        .attr("x", width - 10) 
        .attr("y", height - 10) 
        .attr("text-anchor", "end") 
        .style("fill", "blue") 
        .style("cursor", "pointer")
}
function createBillVis() {
    data = allData
    series = createSeries(data)

    //set up scales
    const x = d3.scaleBand()
        .domain([...new Set(data.map(d => d.year))].sort(d3.ascending))
        .range([margin.left, width - margin.right])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
        .rangeRound([height - margin.bottom, margin.top]);
  
    const color = d3.scaleOrdinal()
        .range(["#04672b", "#5dade2"])
        .domain(series.map(d => d.key))
    

    const svg = d3.select('#BillVis svg')

    //tooltip setup 
    Tooltip = d3.select("#BillVis")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("position", "absolute")

    var mouseover = function(d) {
        Tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
    }

    var mousemove = function(event, d) {

        key = d[0] === 0 ? "Technology" : "Other"
        net_worth = d.data[1].get(key)['total_net_worth']
        total = d.data[1].get("Other")['total_net_worth'] + d.data[1].get("Technology")['total_net_worth']
        pct = 100 * net_worth / total 

        text = ''
        if (type === "normalized") {
            text = key + " Billionaires Total Networth: $" + net_worth.toLocaleString() + " Billion"
        } else {
            text = key + " Billionaire Share of Networth " + pct.toFixed(0) + "%"
        }

        Tooltip
            .html(text)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
    }

    var mouseleave = function(d) {
        Tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    g = svg.append("g")

    //add all the bars
    g.selectAll("g")
        .data(series)
        .join("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .on("click", clicked)
        .attr("x", d => x(d.data[0]))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)

    //put labels on top of the bars
    svg.select("g").selectAll("g") 
        .data(series)
        .selectAll("text")
        .data(d => d) 
        .join("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.data[0]) + x.bandwidth() / 2) 
        .attr("y", d => (y(d[0]) + y(d[1])) / 2) 
        .attr("dy", "0.35em") 
        .attr("text-anchor", "middle") 
        .attr("font-weight", "bold")
        .text(d => {
            var value = 100 * (d[1] - d[0]); 
            if (type == 'normalized') {
                value = value.toFixed(0) + "%";
            } else {
                value = (value / 100).toLocaleString()
            }
            return value
        })
        .attr("fill", "white") 
        .style("font-size", "10px") 
        .style("pointer-events", "none"); 
    
    //add horizontal axis 
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .call(g => g.selectAll(".domain").remove());
    
    // Append the vertical axis.
    if (type == "normalized") {
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s").tickFormat(d3.format(".0%")))
            .call(g => g.selectAll(".domain").remove());
    } else {
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.selectAll(".domain").remove());
    }

    //create legend on top left corner 
    svg.append("rect").attr("x",105).attr("y",20).attr("width", 10).attr("height", 10).style("fill", "#04672b")
    svg.append("rect").attr("x",105).attr("y",40).attr("width", 10).attr("height", 10).style("fill", "#5dade2")
    svg.append("text").attr("x", 120).attr("y", 25).text("Tech").style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", 120).attr("y", 45).text("Others").style("font-size", "15px").attr("alignment-baseline","middle")
    

    svg.append("text")
        .text("Share of Billionaire Net Worth by 'Technology' vs 'Other' Billionaires")
        .attr("x", 520)  
        .attr("y", 50)   
        .attr("text-anchor", "middle") 
        .style("fill", "black")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")

    //add clickable source
    link = svg.append("a")
        .attr("xlink:href", dataSourceLink) 
        .attr("target", "_blank")


    link.append("text")
        .text(dataSourceText)
        .attr("x", width - 10) 
        .attr("y", height - 10) 
        .attr("text-anchor", "end") 
        .style("fill", "blue") 
        .style("cursor", "pointer")

    //function to zoom out and reset to default bar chart
    function reset(event, d) {

        d3.selectAll(".bar-segment")
            .transition()        
            .duration(750)       
            .style("opacity", 0) 
            .remove()


        d3.selectAll(".axis")
            .transition()        
            .duration(750)
            .style("opacity", 1) 

        d3.selectAll(".bar-label")
            .transition()        
            .duration(750)
            .style("opacity", 1) 

        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
        );
    }

    //function to zoom into bar when clicked 
    function clicked(event, d) {

        coords = this.getBBox()

        year = d.data[0]
        key = d[0] === 0 ? "Technology" : "Other"
        
        //set how many people are highlighted
        individuals = 7

        //filter data to the correct year + industry
        selectedData = originalData.filter(person=> {
            return person.year == year && person.industry == key
            }
        ).sort((a,b) => a.net_worth > b.net_worth)

        //choose top X indivdiduals to display
        barData = selectedData.slice(0, Math.min(individuals, selectedData.length))

        //aggregate the rest to a "Others" data bar
        if (selectedData.length > individuals) {
            total = 0
            for (let i = individuals; i < selectedData.length; i++) {
                total += selectedData[i].net_worth
            }
            barData.push({
                "name": "Others",
                "year": year,
                "industry": key,
                "net_worth": total
            })
        }

        barData.reverse()
        
        //create data for zoomed in stacked bar
        cumulativeNetWorth = 0
        barData = barData.map(d => {
            const y0 = cumulativeNetWorth;
            const y1 = cumulativeNetWorth + d.net_worth;
            cumulativeNetWorth = y1;
            return {
                ...d, // Keep original properties
                y0: y0,
                y1: y1
            };
        });

        total_net_worth = d.data[1].get(key)['total_net_worth']

        //scales for detailed view 
        const yHighlight = d3.scaleLinear()
            .domain([0, total_net_worth])
            .range([coords.y, coords.y + coords.height]);

        const colorScale = d3.scaleOrdinal()
            .range(["#23171b","#4569ee","#26bce1","#3ff393","#95fb51","#ecd12e","#ff821d","#cb2f0d","#900c00"])
            .domain(data.map(d => d.name));
        

        //make axis disappear to make detailed view more focused
        d3.selectAll(".axis")
            .transition()        
            .duration(750)
            .style("opacity", 0) 

        d3.selectAll(".bar-label")
            .transition()        
            .duration(750)
            .style("opacity", 0) 

        event.stopPropagation();
        
        //zoom stuff
        currentTransform = d3.zoomTransform(svg.node())

        //controls how zoomed in the view is 
        scaleFactor = 0.9
        const scale = Math.min(zoom.scaleExtent()[1], 
            scaleFactor / Math.max(coords.width / width, coords.height / height));

        centerX = (coords.x + coords.width / 2)
        centerY = (coords.y + coords.height / 2)

        //scale and translate to selected bar 
        const newTransform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);

        //tooltip stuff
        var highlightOver = function(d) {
            Tooltip
                .style("opacity", 1)
            d3.select(this)
                .style("stroke", "black")
        }

        var highlightMove = function(event, d) {
            
            text = ''
            if (d.name == "Others") {
                text = "Others are worth " + Math.round(d.net_worth).toLocaleString() + " billions"
            } else {
                text = d.name + " is worth " + Math.round(d.net_worth).toLocaleString() + " billions"
            }
            
            Tooltip
                .html(text)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        }

        var highlightLeave = function(d) {
            Tooltip
                .style("opacity", 0)
            d3.select(this)
                .style("stroke", "none")
        }

        //remove old detailed, useful when users click another bar when in zoomed in view
        d3.selectAll(".bar-segment")
            .remove()

        //create detailed bars
        g.selectAll(".bar-segment")
            .data(barData)
            .enter()
            .append("rect")
            .attr("class", "bar-segment")
            .attr("x", x(year)) 
            .attr("width", x.bandwidth()) 
            .attr("y", d => yHighlight(d.y0))
            .attr("height", d => yHighlight(d.y1) - yHighlight(d.y0))
            .attr("fill", d => colorScale(d.name))
            .on("mouseover", highlightOver)
            .on("mousemove", highlightMove)
            .on("mouseleave", highlightLeave)

        svg.transition()
            .duration(750) 
            .call(zoom.transform, newTransform)
    }

    //set up zoom stuff for clicking on bars
    zoom = d3.zoom()
        .scaleExtent([1,8])
        .on("zoom", zoomed)

    function zoomed(event) {
        const { transform } = event;
        g.attr("transform", transform)
        g.attr("stroke-width", 1 / transform.k);
    }

    //override other zoom functionalities that we don't need 
    svg.call(zoom)
        .on("wheel.zoom", null)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);

    svg.on("click", reset)
}

function BillInit(){
    createContributionVis()
    d3.csv(Billpath, convertTypes)
    .then(data => {
            const grouped = {};

            //aggregate net_worth and billionair count by year and industry 
            for (const { name, year, industry, net_worth, country} of data) {

                if (country === "United States" && year >= 2006) {

                    //keep a copy of the original data 
                    originalData.push(
                        {
                            "name": name,
                            "year": year,
                            "industry": industry,
                            "net_worth": net_worth
                        }
                    )
                    const key = `${year}::${industry}`;
                    if (!grouped[key]) {
                        grouped[key] = {net_worth: 0, count: 0 };
                    }
                    grouped[key]['net_worth'] += net_worth;
                    //didn't end up being used
                    grouped[key]['count'] += 1;
                }
            }

            
            const result = Object.entries(grouped).map(([key, total]) => {
                const [year, industry] = key.split("::");
                return { year, industry, total_net_worth: Math.round(total['net_worth']), total_count: total['count'] };
            });

            allData = result
            setupBillSelector()
            createBillVis()
        })
    .catch(error => console.error('Error loading data:', error));
}

window.addEventListener('load', BillInit);