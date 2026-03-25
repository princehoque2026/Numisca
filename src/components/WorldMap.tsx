import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface WorldMapProps {
  collectedCountries: string[];
}

export const WorldMap: React.FC<WorldMapProps> = ({ collectedCountries }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 450;

    // Clear previous content
    svg.selectAll('*').remove();

    const projection = d3.geoMercator()
      .scale(120)
      .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    // Load world map data
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then((data: any) => {
      svg.append('g')
        .selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', path as any)
        .attr('fill', (d: any) => {
          const countryName = d.properties.name;
          return collectedCountries.includes(countryName) ? '#000000' : '#F3F4F6';
        })
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d: any) {
          d3.select(this)
            .attr('fill', collectedCountries.includes(d.properties.name) ? '#333333' : '#E5E7EB');
          
          // Simple tooltip
          svg.append('text')
            .attr('id', 'tooltip')
            .attr('x', 10)
            .attr('y', height - 10)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('text-transform', 'uppercase')
            .attr('letter-spacing', '0.1em')
            .text(d.properties.name + (collectedCountries.includes(d.properties.name) ? ' (Collected)' : ''));
        })
        .on('mouseout', function(event, d: any) {
          d3.select(this)
            .attr('fill', collectedCountries.includes(d.properties.name) ? '#000000' : '#F3F4F6');
          svg.select('#tooltip').remove();
        });
    });
  }, [collectedCountries]);

  return (
    <div className="w-full aspect-[16/9] bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm relative">
      <svg
        ref={svgRef}
        viewBox="0 0 800 450"
        className="w-full h-full"
      />
      <div className="absolute bottom-6 right-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-black rounded-full"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Collected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 rounded-full border border-gray-200"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Not Yet</span>
        </div>
      </div>
    </div>
  );
};
