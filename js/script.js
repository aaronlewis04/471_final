const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 1200 - margin.left - margin.right;
const height = 1000 - margin.top - margin.bottom;

Billpath = 'data/all_billionaires_1997_2024.csv'
allData = []
originalData = []
options = ['nominal', 'normalized']
type = options[1]

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

function setupBillSelector(){
    const selector = d3.select('.form-select')

    selector
        .selectAll('myOptions')
        .data(options)
        .enter()
        .append('option')
        .text(d => d) // The displayed text
        .attr("value",d => d)

    selector
        .on("change", function (event) {
            let newVar = d3.select(this).property("value");
            type = newVar
            d3.select("#BillVis svg")
                .selectAll('*') 
                .remove(); 
            createBillVis();
        })
    d3.select('#format').property('value', type)
}
function createBillVis() {
    data = allData
    var series = 0

    zoom = d3.zoom()
        .scaleExtent([1,8])
        .on("zoom", zoomed)

    function zoomed(event) {
        const { transform } = event;
        g.attr("transform", transform)
        g.attr("stroke-width", 1 / transform.k);
    }

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
    
    const x = d3.scaleBand()
        .domain([...new Set(data.map(d => d.year))].sort(d3.ascending))
        .range([margin.left, width - margin.right])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
        .rangeRound([height - margin.bottom, margin.top]);
  
    const color = d3.scaleOrdinal(d3.schemePaired)
        .domain(series.map(d => d.key))
    
    const svg = d3.select('#BillVis svg')

    svg.on("click", reset)

    var Tooltip = d3.select("#BillVis")
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

    
    g.selectAll("g")
        .data(series)
        .join("g")
        //.attr("class", "bar-container")
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
        .attr("fill", "white") // Text color for visibility against colored bars
        .style("font-size", "10px") // Adjust font size as needed
        .style("pointer-events", "none"); 

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

    function clicked(event, d) {

        coords = this.getBBox()
        //possible solution, hide current bar and then overlay
        /*
        d3.select(this)
            .attr("visibility", "hidden")
        */

        year = d.data[0]
        key = d[0] === 0 ? "Technology" : "Other"
        
        //set how many people are highlighted
        individuals = 8
        selectedData = originalData.filter(person=> {
            return person.year == year && person.industry == key
            }
        ).sort((a,b) => a.net_worth > b.net_worth)

        barData = selectedData.slice(0, Math.min(individuals, selectedData.length))

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

        const yHighlight = d3.scaleLinear()
            .domain([0, total_net_worth])
            .range([coords.y, coords.y + coords.height]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10) 
            .domain(data.map(d => d.name));


        d3.selectAll(".axis")
            .transition()        
            .duration(750)
            .style("opacity", 0) 

        d3.selectAll(".bar-label")
            .transition()        
            .duration(750)
            .style("opacity", 0) 

        event.stopPropagation();
        
        currentTransform = d3.zoomTransform(svg.node())

        scaleFactor = 0.9
        const scale = Math.min(zoom.scaleExtent()[1], 
            scaleFactor / Math.max(coords.width / width, coords.height / height));

        centerX = (coords.x + coords.width / 2)
        centerY = (coords.y + coords.height / 2)

        const newTransform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);

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

        d3.selectAll(".bar-segment")
            .remove()

        
        g.selectAll(".bar-segment")
            .data(barData)
            .enter()
          .append("rect")
            .attr("class", "bar-segment")
            .attr("x", x(year)) 
            .attr("width", x.bandwidth()) 
            .attr("y", d => yHighlight(d.y0))
            // height: The height of the segment, difference between bottom (y0) and top (y1) in scale
            .attr("height", d => yHighlight(d.y1) - yHighlight(d.y0))
            .attr("fill", d => colorScale(d.name))
            .on("mouseover", highlightOver)
            .on("mousemove", highlightMove)
            .on("mouseleave", highlightLeave)

        svg.transition()
            .duration(750) 
            .call(zoom.transform, newTransform)
    }


    svg.call(zoom)
        .on("wheel.zoom", null)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);
}

function BillInit(){
    d3.csv(Billpath, convertTypes)
    .then(data => {
            const grouped = {};

            
            //aggregate net_worth and billionair count by year and industry 
            for (const { name, year, industry, net_worth, country} of data) {

                if (country === "United States" && year >= 2006) {
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

function BillInit(){
    d3.csv(Billpath, convertTypes)
    .then(data => {
            const grouped = {};

            //aggregate net_worth and billionair count by year and industry 
            for (const { name, year, industry, net_worth, country} of data) {

                if (country === "United States" && year >= 2006) {
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

// Create SVG
const svg = d3.select('#BillVis')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

