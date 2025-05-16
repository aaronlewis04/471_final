// Set margin
const margin = { top: 100, right: 60, bottom: 60, left: 100 };
const width = 1000 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body")
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
const x = d3.scaleLinear().domain([2010, 2025]).range([0, width]);
let y = d3.scaleLinear();

const chartTitle = svg.append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Market Cap (2010–2025) for $AAPL");

svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .text("Years");

const yLabel = svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .text("Market Cap (Billions of Dollars)");

function init() {
    d3.select("#metricSelect").property("value", "Market Cap");
    d3.select("#tickerSelect").property("value", "Default");
    update();
}
function defaultStart() {
  Promise.all([
      d3.csv('data/TECH.csv', d3.autoType),
      d3.csv('data/OTHER.csv', d3.autoType)
  ]).then(([techData, otherData]) => {
      techData.forEach((d, i) => {
          d.year = +d.Year;
          d.techMC = +d.MC;
          d.otherMC = +otherData[i].MC;
      });

      // Clean chart
      svg.selectAll(".axis, .grid, path, .y-zero-label, .zero-line, .dot, .area").remove();

      // Update chart labels
      chartTitle.text("Market Cap (2010–2025): Tech vs Other");
      yLabel.text("Market Cap (Billions of Dollars)");

      // Set Y scale
      y = d3.scaleLinear()
          .domain([0, d3.max(techData, d => Math.max(d.techMC, d.otherMC))])
          .range([height, 0]);

      // Draw axes
      svg.append("g")
          .attr("transform", `translate(0,${height})`)
          .attr("class", "axis")
          .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(d3.range(2010, 2026)));

      svg.append("g")
          .attr("class", "axis")
          .call(d3.axisLeft(y).ticks(Math.ceil(y.domain()[1] / 500)).tickFormat(d3.format(",")));

      // Add grid lines
      svg.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(y).tickSize(-width).tickFormat("").ticks(6))
          .selectAll(".tick")
          .filter(d => d === 0)
          .remove();

      // Area under tech
      const areaTech = d3.area()
          .x(d => x(d.year))
          .y0(height)
          .y1(d => y(d.techMC));

      svg.append("path")
          .datum(techData)
          .attr("class", "area")
          .attr("fill", "lightgreen")
          .attr("opacity", 0)
          .attr("d", areaTech)
          .transition()
          .duration(500)
          .attr("opacity", 0.4);

      // Tech line
      const techLine = d3.line()
          .x(d => x(d.year))
          .y(d => y(d.techMC));

      const techPath = svg.append("path")
          .datum(techData)
          .attr("fill", "none")
          .attr("stroke", "darkgreen")
          .attr("stroke-width", 3)
          .attr("d", techLine);

      const totalLengthTech = techPath.node().getTotalLength();
      techPath
          .attr("stroke-dasharray", `${totalLengthTech} ${totalLengthTech}`)
          .attr("stroke-dashoffset", totalLengthTech)
          .transition()
          .duration(500)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0);

      // Other line
      const otherLine = d3.line()
          .x(d => x(d.year))
          .y(d => y(d.otherMC));

      const otherPath = svg.append("path")
          .datum(techData)
          .attr("fill", "none")
          .attr("stroke", "purple")
          .attr("stroke-width", 3)
          .attr("d", otherLine);

      const totalLengthOther = otherPath.node().getTotalLength();
      otherPath
          .attr("stroke-dasharray", `${totalLengthOther} ${totalLengthOther}`)
          .attr("stroke-dashoffset", totalLengthOther)
          .transition()
          .duration(500)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0);

      // Tooltip dots for tech
      svg.selectAll(".dot-tech")
          .data(techData)
          .enter().append("circle")
          .attr("class", "dot dot-tech")
          .attr("cx", d => x(d.year))
          .attr("cy", d => y(d.techMC))
          .attr("r", 4)
          .attr("fill", "darkgreen")
          .on("mouseover", (event, d) => {
              tooltip.html(`Year: ${d.year}<br>Tech: ${d.techMC.toLocaleString()} B`)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 28) + "px")
                  .transition().duration(200)
                  .style("opacity", 0.9);
          })
          .on("mousemove", event => {
              tooltip
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

      // Tooltip dots for other
      svg.selectAll(".dot-other")
          .data(techData)
          .enter().append("circle")
          .attr("class", "dot dot-other")
          .attr("cx", d => x(d.year))
          .attr("cy", d => y(d.otherMC))
          .attr("r", 4)
          .attr("fill", "purple")
          .on("mouseover", (event, d) => {
              tooltip.html(`Year: ${d.year}<br>Other: ${d.otherMC.toLocaleString()} B`)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 28) + "px")
                  .transition().duration(200)
                  .style("opacity", 0.9);
          })
          .on("mousemove", event => {
              tooltip
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
  });
}



function update() {
    const selectedMetric = d3.select("#metricSelect").property("value");
    const selectedTicker = d3.select("#tickerSelect").property("value");
    if (selectedTicker === "Default") {
      defaultStart();
      return;
  }
    let tickerFile;
    if (selectedTicker === "Tech Industry") {
        tickerFile = "TECH.csv";
    } else if (selectedTicker === "Other Industries") {
        tickerFile = "OTHER.csv";
    } else {
        tickerFile = selectedTicker.replace(/ /g, "_").replace(/\$/g, "") + ".csv";
    }

    d3.csv(`data/${tickerFile}`).then(data => {
        let titleTicker = selectedTicker;
        if (selectedTicker === "Tech Industry") titleTicker = "Tech Industries";
        else if (selectedTicker === "Other Industry") titleTicker = "Other Industries";
        const prefix = (selectedTicker === "Tech Industry" || selectedTicker === "Other Industry") ? "" : "$";
        const titleMetric = selectedMetric === "Market Cap" ? "Market Cap" : "Percent Change";
        chartTitle.text(`${titleMetric} (2010–2025) for ${prefix}${titleTicker}`);
        yLabel.text(selectedMetric === "Market Cap" ? "Market Cap (Billions of Dollars)" : "Percent Change (%)");

        const parsedData = data.map(d => ({
            year: +d.Year,
            marketCap: +d.MC,
            change: +d.change
        }));

        parsedData.sort((a, b) => a.year - b.year); // ensure left-to-right order

        svg.selectAll(".axis, .grid, path, .y-zero-label, .zero-line, .dot, .area").remove();

        y = selectedMetric === "Market Cap"
            ? d3.scaleLinear().domain([0, 4000]).range([height, 0])
            : d3.scaleLinear().domain([-250, 250]).range([height, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .attr("class", "axis")
            .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(d3.range(2010, 2026)));

        const yAxisGroup = svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y));

        if (selectedMetric === "Percent Change (%)") {
            yAxisGroup.selectAll(".tick text").style("font-weight", d => d === 0 ? "bold" : null);
            yAxisGroup.selectAll(".tick line")
                .attr("stroke", d => d === 0 ? "black" : null)
                .attr("stroke-width", d => d === 0 ? 2 : 1);

            yAxisGroup.append("text")
                .attr("class", "y-zero-label")
                .attr("x", -30)
                .attr("y", y(0) + 5)
                .attr("fill", "black")
                .attr("font-weight", "bold")
                .text("0%");

            svg.append("line")
                .attr("class", "zero-line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", y(0))
                .attr("y2", y(0))
                .attr("stroke", "black")
                .attr("stroke-width", 2);
        }

        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).tickSize(-width).tickFormat("").ticks(6))
            .selectAll(".tick")
            .filter(d => d === 0)
            .remove();

        const line = d3.line()
            .defined(d => selectedMetric === "Market Cap" || d.change != null)
            .x(d => x(d.year))
            .y(d => y(selectedMetric === "Market Cap" ? d.marketCap : d.change));

        const area = d3.area()
            .defined(d => selectedMetric === "Market Cap" || d.change != null)
            .x(d => x(d.year))
            .y0(selectedMetric === "Market Cap" ? height : y(0))
            .y1(d => y(selectedMetric === "Market Cap" ? d.marketCap : d.change));

        const path = svg.append("path")
            .datum(parsedData)
            .attr("fill", "none")
            .attr("stroke", selectedMetric === "Market Cap" ? "darkgreen" : "steelblue")
            .attr("stroke-width", 3)
            .attr("d", line);

        const totalLength = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        svg.append("path")
            .datum(parsedData)
            .attr("class", "area")
            .attr("fill", selectedMetric === "Market Cap" ? "lightgreen" : "#a2c4f9")
            .attr("opacity", 0)
            .attr("d", area)
            .transition()
            .duration(500)
            .attr("opacity", 0.4);

        // Add tooltip-enabled dots
        svg.selectAll(".dot")
            .data(parsedData)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(selectedMetric === "Market Cap" ? d.marketCap : d.change))
            .attr("r", 4)
            .attr("fill", selectedMetric === "Market Cap" ? "darkgreen" : "steelblue")
            .on("mouseover", (event, d) => {
                const value = selectedMetric === "Market Cap"
                    ? d.marketCap.toLocaleString() + " B"
                    : d.change + "%";
                tooltip
                    .html(`Year: ${d.year}<br>${titleMetric}: ${value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .transition().duration(200)
                    .style("opacity", 0.9);
            })
            .on("mousemove", event => {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(200)
                    .style("opacity", 0);
            });
    });
}

// Initial draw
init();


// Pie chart visualization

const pieMargin = { top: 80, right: 100, bottom: 80, left: 100 };
const pieWidth = 1000 - pieMargin.left - pieMargin.right;
const pieHeight = 300 - pieMargin.top - pieMargin.bottom;
const pieRadius = 100;

const pieSvgContainer = d3.select('#vis2')
  .append('svg')
  .attr('width', pieWidth + pieMargin.left + pieMargin.right)
  .attr('height', pieHeight + pieMargin.top + pieMargin.bottom + 100);

// Add slider label
pieSvgContainer.append('text')
  .attr('x', pieMargin.left + pieWidth / 2)
  .attr('y', 30)
  .attr('text-anchor', 'middle')
  .style('font-size', '16px')
  .text('Select Year');

// Add slider group
let targetYear = 2010;
let sliderWidth = Math.min(pieWidth, 600);
let yearSlider = d3.sliderHorizontal()
  .min(2010)
  .max(2025)
  .step(1)
  .tickFormat(d3.format("d"))
  .value(targetYear)
  .width(sliderWidth - 100)
  .displayValue(false)
  .on('onchange', val => {
    targetYear = +val;
    drawPieChart(targetYear);
  });

pieSvgContainer.append('g')
  .attr('transform', `translate(${pieMargin.left + (pieWidth - sliderWidth + 100) / 2}, 50)`)
  .call(yearSlider);

// Pie chart group
const pieSvg = pieSvgContainer
  .append('g')
  .attr('transform', `translate(${pieMargin.left + pieWidth / 2}, ${pieMargin.top + pieHeight / 2 + 50})`);

const pieColor = d3.scaleOrdinal()
  .domain(['Tech', 'Other'])
  .range(['#e8b200', '#7e57c2']);

const arc = d3.arc()
  .innerRadius(pieRadius - 30)
  .outerRadius(pieRadius);

const pie = d3.pie().value(d => d.value);

function drawPieChart(year) {
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

    const paths = pieSvg.selectAll('path').data(pieArcs);

    paths.enter()
      .append('path')
      .attr('fill', d => pieColor(d.data.label))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .each(function(d) { this._current = d; })
      .merge(paths)
      .transition().duration(500)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1);
        return function(t) {
          return arc(interpolate(t));
        };
      });

    paths.exit().remove();

    // Remove any previous percentage labels
    pieSvg.selectAll('.pie-center-label').remove();

    const percentTech = ((techMC / total) * 100).toFixed(2) + '%';
    const percentOther = ((otherMC / total) * 100).toFixed(2) + '%';

    pieSvg.append('text')
      .attr('class', 'pie-center-label')
      .attr('text-anchor', 'middle')
      .attr('y', -8)
      .style('font-size', '12px')
      .style('fill', '#444')
      .text(`Tech: ${percentTech}`)
      .style('font-weight', 'bold');

    pieSvg.append('text')
      .attr('class', 'pie-center-label')
      .attr('text-anchor', 'middle')
      .attr('y', 12)
      .style('font-size', '12px')
      .style('fill', '#444')
      .text(`Other: ${percentOther}`)
      .style('font-weight', 'bold');
  });
}

// Add Legend inside pieSvgContainer (bottom right)
const legend = pieSvgContainer.append('g')
  .attr('transform', `translate(${pieMargin.left + pieWidth - 150}, ${pieMargin.top + pieHeight + 40})`);

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
