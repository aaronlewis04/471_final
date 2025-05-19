// Set s_margin
const s_margin = { top: 100, right: 60, bottom: 60, left: 100 };
const s_width = 1000 - s_margin.left - s_margin.right;
const s_height = 600 - s_margin.top - s_margin.bottom;

// Create s_SVG
const s_svg = d3.select('#vis')
  .append('svg')
  .attr('width', s_width + s_margin.left + s_margin.right)
  .attr('height', s_height + s_margin.top + s_margin.bottom)
  .append('g')
  .attr('transform', `translate(${s_margin.left},${s_margin.top})`);

// s_Tooltip
const s_tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("pointer-events", "none")
  .style("background", "white")
  .style("border", "1px solid #ccc")
  .style("padding", "5px")
  .style("font-size", "12px")
  .style("opacity", 0);

// Hook both dropdowns
['#metricSelect', '#tickerSelect'].forEach(id => {
  d3.select(id).on("change", update);
});

// Scales and Axes
const s_x = d3.scaleLinear().domain([2010, 2025]).range([0, s_width]);
let s_y = d3.scaleLinear();

const s_chartTitle = s_svg.append("text")
  .attr("x", s_width / 2)
  .attr("y", -30)
  .attr("text-anchor", "middle")
  .attr("class", "chart-title")
  .text("Market Cap (2010–2025) for $AAPL");

// X axis text
s_svg.append("text")
  .attr("class", "x label")
  .attr("text-anchor", "middle")
  .attr("x", s_width / 2)
  .attr("y", s_height + 40)
  .text("Years");

// Y axis labels
const s_yLabel = s_svg.append("text")
  .attr("class", "y label")
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)")
  .attr("x", -s_height / 2)
  .attr("y", -50)
  .text("Market Cap (Billions of Dollars)");

// Initialization function
function init() {
  d3.select("#metricSelect").property("value", "Market Cap");
  d3.select("#tickerSelect").property("value", "Default");
  update();
}

// The default start function that shows the original default graph (comparison)
function defaultStart() {
  const selectedMetric = d3.select("#metricSelect").property("value");

  // Load data
  Promise.all([
    d3.csv("data/TECH.csv", d3.autoType),
    d3.csv("data/OTHER.csv", d3.autoType)
  ]).then(([techData, otherData]) => {
    techData.sort((a, b) => +a.Year - +b.Year);
    otherData.sort((a, b) => +a.Year - +b.Year);
    // combined data for tech and other sector 
    const combinedData = techData.map((d, i) => {
      const year = +d.Year;
      const techMC = +d.MC;
      const otherMC = +otherData[i].MC;

      // calculation for YoY change 
      const prevTechMC = i === 0 ? techMC : +techData[i - 1].MC;
      const prevOtherMC = i === 0 ? otherMC : +otherData[i - 1].MC;

      const techChange = i === 0 ? 0 : ((techMC - prevTechMC) / prevTechMC) * 100;
      const otherChange = i === 0 ? 0 : ((otherMC - prevOtherMC) / prevOtherMC) * 100;

      // Return data for the graph 
      return {
        year,
        techMC,
        otherMC,
        techChange,
        otherChange
      };
    });

    s_svg.selectAll(".axis, .grid, path, .y-zero-label, .zero-line, .dot, .area").remove();

    // What we have selected
    const titleMetric = selectedMetric === "Market Cap" ? "Market Cap" : "Percent Change (%)";
    s_chartTitle.text(`${titleMetric} (2010–2025): Tech vs Other`);
    s_yLabel.text(titleMetric);

    // Market cap selection
    y = selectedMetric === "Market Cap"
      ? d3.scaleLinear().domain([0, d3.max(combinedData, d => Math.max(d.techMC, d.otherMC))]).range([s_height, 0])
      : d3.scaleLinear().domain([-100, 100]).range([s_height, 0]);

    s_svg.append("g")
      .attr("transform", `translate(0,${s_height})`)
      .attr("class", "axis")
      .call(d3.axisBottom(s_x).tickFormat(d3.format("d")).tickValues(d3.range(2010, 2026)));

    const yAxisGroup = s_svg.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(selectedMetric === "Market Cap" ? 6 : 6));


    // Selection of percent change
    if (selectedMetric === "Percent Change") {
      // Bold 0% tick label
      yAxisGroup.selectAll(".tick text")
        .style("font-weight", d => d === 0 ? "bold" : null);

      // Bold 0% tick line
      yAxisGroup.selectAll(".tick line")
        .attr("stroke", d => d === 0 ? "black" : null)
        .attr("stroke-s_width", d => d === 0 ? 2 : 1);

      // Add bold 0% label on axis
      yAxisGroup.append("text")
        .attr("class", "y-zero-label")
        .attr("x", -30)
        .attr("y", y(0) + 5)
        .attr("fill", "black")
        .attr("font-weight", "bold")
        .text("0%");

      // Add bold horizontal line at 0%
      s_svg.append("line")
        .attr("class", "zero-line")
        .attr("x1", 0)
        .attr("x2", s_width)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "black")
        .attr("stroke-s_width", 2);
    }

    // For the ticks on the graph 
    s_svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-s_width).tickFormat("").ticks(6));

    // Line 
    const techLine = d3.line()
      .x(d => s_x(d.year))
      .y(d => y(selectedMetric === "Market Cap" ? d.techMC : d.techChange));

    const otherLine = d3.line()
      .x(d => s_x(d.year))
      .y(d => y(selectedMetric === "Market Cap" ? d.otherMC : d.otherChange));
    // Calculate area for the shaded region 
    if (selectedMetric === "Market Cap") {
      // Highlight area between lines (segmented)
      for (let i = 1; i < combinedData.length; i++) {
        const prev = combinedData[i - 1];
        const curr = combinedData[i];
        const segData = [prev, curr];
        // Below code breaks down area below other, above tech and between the two curves
        const isTechHigher = curr.techMC > curr.otherMC;

        const areaTechAbove = d3.area()
          .x(d => s_x(d.year))
          .y0(d => y(d.otherMC))
          .y1(d => y(d.techMC));

        const areaOtherAbove = d3.area()
          .x(d => x(d.year))
          .y0(d => y(d.techMC))
          .y1(d => y(d.otherMC));
        // Fill tech with green
        s_svg.append("path")
          .datum(segData)
          .attr("fill", isTechHigher ? "lightgreen" : "#d6eaf8")
          .attr("opacity", 0.4)
          .attr("d", isTechHigher ? areaTechAbove : areaOtherAbove);
      }

      const otherArea = d3.area()
        .x(d => s_x(d.year))
        .y0(s_height)
        .y1(d => y(d.otherMC));
      // Fill other with blue
      s_svg.append("path")
        .datum(combinedData)
        .attr("fill", "#d6eaf8")
        .attr("opacity", 0.3)
        .attr("d", otherArea);
    }



    // Same buf for market cap...
    if (selectedMetric === "Market Cap") {
      const otherArea = d3.area()
        .x(d => s_x(d.year))
        .y0(s_height)
        .y1(d => y(d.otherMC));
      s_svg.append("path")
        .datum(combinedData)
        .attr("fill", "#d6eaf8")
        .attr("opacity", 0.3)
        .attr("d", otherArea);
    }

    // Line for tech line
    const techPath = s_svg.append("path")
      .datum(combinedData)
      .attr("fill", "none")
      .attr("stroke", "darkgreen")
      .attr("stroke-s_width", 3)
      .attr("d", techLine);
    // Line for other line
    const otherPath = s_svg.append("path")
      .datum(combinedData)
      .attr("fill", "none")
      .attr("stroke", "#5dade2")
      .attr("stroke-s_width", 3)
      .attr("d", otherLine);

    // s_Tooltip dots to hover over
    s_svg.selectAll(".dot-tech")
      .data(combinedData)
      .enter().append("circle")
      .attr("class", "dot dot-tech")
      .attr("cx", d => s_x(d.year))
      .attr("cy", d => y(selectedMetric === "Market Cap" ? d.techMC : d.techChange))
      .attr("r", 4)
      .attr("fill", "darkgreen")
      .on("mouseover", (event, d) => {
        const value = selectedMetric === "Market Cap" ? `${d.techMC.toLocaleString()} B` : `${d.techChange.toFixed(1)}%`;
        s_tooltip.html(`Year: ${d.year}<br>Tech: ${value}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
          .transition().duration(200).style("opacity", 0.9);
      })
      // Mouse events for the tooltip
      .on("mousemove", event => s_tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px"))
      .on("mouseout", () => s_tooltip.transition().duration(200).style("opacity", 0));
    
    s_svg.selectAll(".dot-other")
      .data(combinedData)
      .enter().append("circle")
      .attr("class", "dot dot-other")
      .attr("cx", d => s_x(d.year))
      .attr("cy", d => y(selectedMetric === "Market Cap" ? d.otherMC : d.otherChange))
      .attr("r", 4)
      .attr("fill", "#5dade2")
      .on("mouseover", (event, d) => {
        const value = selectedMetric === "Market Cap" ? `${d.otherMC.toLocaleString()} B` : `${d.otherChange.toFixed(1)}%`;
        s_tooltip.html(`Year: ${d.year}<br>Other: ${value}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
          .transition().duration(200).style("opacity", 0.9);
      })
      .on("mousemove", event => s_tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px"))
      .on("mouseout", () => s_tooltip.transition().duration(200).style("opacity", 0));
  });
}

// Method to update based on what the user wants
function update() {
  const selectedMetric = d3.select("#metricSelect").property("value");
  const selectedTicker = d3.select("#tickerSelect").property("value");
  // Default start if the selected ticker is default
  if (selectedTicker === "Default") {
    defaultStart();
    return;
  }

  // Cases for tech and other without comparison
  let tickerFile;
  if (selectedTicker === "Tech Industry") {
    tickerFile = "TECH.csv";
  } else if (selectedTicker === "Other Industries") {
    tickerFile = "OTHER.csv";
  } else {
    tickerFile = selectedTicker.replace(/ /g, "_").replace(/\$/g, "") + ".csv";
  }

  // Determine company color style
  const techCompanies = ["AAPL", "NVDA", "AMZN", "GOOG", "MSFT", "Tech Industry"];
  const otherCompanies = ["JNJ", "JPM", "PG", "V", "XOM"];
  const isTechCompany = techCompanies.includes(selectedTicker);
  const lineColor = isTechCompany ? "darkgreen" : "#5dade2";
  const areaColor = isTechCompany ? "lightgreen" : "#d6eaf8";

  // For the other tickers, match it with the csv
  d3.csv(`data/${tickerFile}`).then(data => {
    let titleTicker = selectedTicker;
    if (selectedTicker === "Tech Industry") titleTicker = "Tech Industries";
    else if (selectedTicker === "Other Industries") titleTicker = "Other Industries";
    const prefix = (selectedTicker === "Tech Industry" || selectedTicker === "Other Industries") ? "" : "$";
    const titleMetric = selectedMetric === "Market Cap" ? "Market Cap" : "Percent Change";
    s_chartTitle.text(`${titleMetric} (2010–2025) for ${prefix}${titleTicker}`);
    s_yLabel.text(selectedMetric === "Market Cap" ? "Market Cap (Billions of Dollars)" : "Percent Change (%)");
    // Parsed data
    const parsedData = data.map(d => ({
      year: +d.Year,
      marketCap: +d.MC,
      change: +d.change
    })).sort((a, b) => a.year - b.year);

    s_svg.selectAll(".axis, .grid, path, .y-zero-label, .zero-line, .dot, .area").remove();
    // Metric selection 
    y = selectedMetric === "Market Cap"
      ? d3.scaleLinear().domain([0, 4000]).range([s_height, 0])
      : d3.scaleLinear().domain([-250, 250]).range([s_height, 0]);

    s_svg.append("g")
      .attr("transform", `translate(0,${s_height})`)
      .attr("class", "axis")
      .call(d3.axisBottom(s_x).tickFormat(d3.format("d")).tickValues(d3.range(2010, 2026)));

    const yAxisGroup = s_svg.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(selectedMetric === "Market Cap" ? 9 : 6));
    
      // Selected percent change
    if (selectedMetric === "Percent Change") {
      yAxisGroup.selectAll(".tick text")
        .style("font-weight", d => d === 0 ? "bold" : null);
      // Line going across the x axis above y=0
      yAxisGroup.selectAll(".tick line")
        .attr("stroke", d => d === 0 ? "black" : null)
        .attr("stroke-s_width", d => d === 0 ? 2 : 1);
      // Y axis text attributes
      yAxisGroup.append("text")
        .attr("class", "y-zero-label")
        .attr("x", -30)
        .attr("y", y(0) + 5)
        .attr("fill", "black")
        .attr("font-weight", "bold")
        .text("0%");
      // Line attributes
      s_svg.append("line")
        .attr("class", "zero-line")
        .attr("x1", 0)
        .attr("x2", s_width)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "black")
        .attr("stroke-s_width", 2);
    }
    // Grid
    s_svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-s_width).tickFormat("").ticks(6));
    // Line for market cap
    const line = d3.line()
      .defined(d => selectedMetric === "Market Cap" || d.change != null)
      .x(d => s_x(d.year))
      .y(d => y(selectedMetric === "Market Cap" ? d.marketCap : d.change));
    // Area under market cap
    const area = d3.area()
      .defined(d => selectedMetric === "Market Cap" || d.change != null)
      .x(d => s_x(d.year))
      .y0(selectedMetric === "Market Cap" ? s_height : y(0))
      .y1(d => y(selectedMetric === "Market Cap" ? d.marketCap : d.change));
    // Path
    const path = s_svg.append("path")
      .datum(parsedData)
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-s_width", 3)
      .attr("d", line);
    // For animation
    const totalLength = path.node().getTotalLength();

    path.attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(500)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    s_svg.append("path")
      .datum(parsedData)
      .attr("class", "area")
      .attr("fill", areaColor)
      .attr("opacity", 0.4)
      .attr("d", area);
    // Tooltip data
    s_svg.selectAll(".dot")
      .data(parsedData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => s_x(d.year))
      .attr("cy", d => y(selectedMetric === "Market Cap" ? d.marketCap : d.change))
      .attr("r", 4)
      .attr("fill", lineColor)
      .on("mouseover", (event, d) => {
        const value = selectedMetric === "Market Cap"
          ? d.marketCap.toLocaleString() + " B"
          : d.change + "%";
        s_tooltip.html(`Year: ${d.year}<br>${titleMetric}: ${value}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
          .transition().duration(200).style("opacity", 0.9);
      })
      .on("mousemove", event => {
        s_tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        s_tooltip.transition().duration(200).style("opacity", 0);
      });
  });
}


// Initial draw
init();

// Pie chart visualization
// SVG Margins for pie chart
const pies_Margin = { top: 80, right: 100, bottom: 80, left: 100 };
const pies_Width = 1000 - pies_Margin.left - pies_Margin.right;
const pies_Height = 300 - pies_Margin.top - pies_Margin.bottom;
const pieRadius = 100;
// Container
const pies_SvgContainer = d3.select('#vis2')
  .append('svg')
  .attr('width', pies_Width + pies_Margin.left + pies_Margin.right)
  .attr('height', pies_Height + pies_Margin.top + pies_Margin.bottom + 100);

// Add slider label
pies_SvgContainer.append('text')
  .attr('x', pies_Margin.left + pies_Width / 2)
  .attr('y', 30)
  .attr('text-anchor', 'middle')
  .style('font-size', '16px')
  .text('Select Year');

// Add slider group -- Lab 4
let targetYear = 2010;
let sliders_Width = Math.min(pies_Width, 600);
let yearSlider = d3.sliderHorizontal()
  .min(2010)
  .max(2025)
  .step(1)
  .tickFormat(d3.format("d"))
  .value(targetYear)
  .width(sliders_Width - 100)
  .displayValue(false)
  .on('onchange', val => {
    targetYear = +val;
    drawPieChart(targetYear);
  });

pies_SvgContainer.append('g')
  .attr('transform', `translate(${pies_Margin.left + (pies_Width - sliders_Width + 100) / 2}, 50)`)
  .call(yearSlider);

// Pie chart group
const pies_Svg = pies_SvgContainer
  .append('g')
  .attr('transform', `translate(${pies_Margin.left + pies_Width / 2}, ${pies_Margin.top + pies_Height / 2 + 50})`);
// Color map
const pieColor = d3.scaleOrdinal()
  .domain(['Tech', 'Other'])
  .range(['darkgreen', '#5dade2']);
// Radius of the pie
const arc = d3.arc()
  .innerRadius(pieRadius - 30)
  .outerRadius(pieRadius);

const pie = d3.pie().value(d => d.value);

// Draws the chart 
function drawPieChart(year) {
  // Data for the pie chart 
  Promise.all([
    d3.csv('data/TECH.csv'),
    d3.csv('data/OTHER.csv')
  ]).then(([techData, otherData]) => {
    const tech = techData.find(d => +d.Year === year);
    const other = otherData.find(d => +d.Year === year);

    const techMC = +tech.MC;
    const otherMC = +other.MC;
    const total = techMC + otherMC;

    const pieData = [
      { label: 'Tech', value: techMC },
      { label: 'Other', value: otherMC }
    ];

    const pieArcs = pie(pieData);

    const paths = pies_Svg.selectAll('path').data(pieArcs);
    // Path for tech and other 
    paths.enter()
      .append('path')
      .attr('fill', d => pieColor(d.data.label))
      .attr('stroke', 'white')
      .attr('stroke-s_width', 2)
      .each(function (d) { this._current = d; })
      .merge(paths)
      .transition().duration(500)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1);
        return function (t) {
          return arc(interpolate(t));
        };
      });

    paths.exit().remove();

    // Remove any previous percentage labels
    pies_Svg.selectAll('.pie-center-label').remove();
    // Calculate the percentages
    const percentTech = ((techMC / total) * 100).toFixed(2) + '%';
    const percentOther = ((otherMC / total) * 100).toFixed(2) + '%';
    
    pies_Svg.append('text')
      .attr('class', 'pie-center-label')
      .attr('text-anchor', 'middle')
      .attr('y', -8)
      .style('font-size', '12px')
      .style('fill', '#444')
      .text(`Tech: ${percentTech}`)
      .style('font-weight', 'bold');

    pies_Svg.append('text')
      .attr('class', 'pie-center-label')
      .attr('text-anchor', 'middle')
      .attr('y', 12)
      .style('font-size', '12px')
      .style('fill', '#444')
      .text(`Other: ${percentOther}`)
      .style('font-weight', 'bold');
  });
}

// Add Legend inside pies_SvgContainer (bottom right)
const legend = pies_SvgContainer.append('g')
  .attr('transform', `translate(${pies_Margin.left + pies_Width - 150}, ${pies_Margin.top + pies_Height + 40})`);

legend.selectAll('rect')
  .data(['Tech', 'Other'])
  .enter()
  .append('rect')
  .attr('x', 0)
  .attr('y', (d, i) => i * 25)
  .attr('width', 20)
  .attr('height', 20)
  .attr('fill', d => pieColor(d));

legend.selectAll('text')
  .data(['Tech', 'Other'])
  .enter()
  .append('text')
  .attr('x', 30)
  .attr('y', (d, i) => i * 25 + 14)
  .text(d => d);

// Initial pie chart render
drawPieChart(2010);
