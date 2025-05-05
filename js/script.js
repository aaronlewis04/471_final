const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 1000 - margin.left - margin.right;
const height = 1000 - margin.top - margin.bottom;

Billpath = 'data/all_billionaires_1997_2024.csv'
allData = []
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
    const selector = d3.select('.variable')

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
        console.log(d)
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

    svg.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
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
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .call(g => g.selectAll(".domain").remove());
    

    // Append the vertical axis.
    if (type == "normalized") {
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s").tickFormat(d3.format(".0%")))
            .call(g => g.selectAll(".domain").remove());
    } else {
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.selectAll(".domain").remove());
    }
}

function BillInit(){
    d3.csv(Billpath, convertTypes)
    .then(data => {
            const grouped = {};

            //aggregate net_worth and billionair count by year and industry 
            for (const { year, industry, net_worth, country} of data) {

                if (country === "United States" && year >= 2006) {
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

