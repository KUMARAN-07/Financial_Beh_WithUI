import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';

const LineChart = ({ title, series, xaxis, height = 350 }) => {
  const theme = useTheme();
  
  const chartOptions = {
    chart: {
      type: 'area',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
        },
        autoSelected: 'zoom'
      },
      zoom: {
        enabled: true,
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      background: 'transparent',
      fontFamily: theme.typography.fontFamily,
      dropShadow: {
        enabled: true,
        top: 5,
        left: 0,
        blur: 4,
        opacity: 0.15
      }
    },
    colors: series.map((s, i) => {
      if (s.name.toLowerCase().includes('anomal')) {
        return theme.palette.error.main;
      } else if (i === 0) {
        return theme.palette.primary.main;
      } else {
        return theme.palette.secondary.main;
      }
    }),
    stroke: {
      width: series.map(s => {
        if (s.name.toLowerCase().includes('anomal')) {
          return 2;
        } else {
          return 3;
        }
      }),
      curve: 'smooth',
      lineCap: 'round',
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 10,
        bottom: 0,
        left: 10
      }
    },
    xaxis: {
      categories: xaxis,
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '12px',
          fontFamily: theme.typography.fontFamily,
          fontWeight: 400,
        },
        offsetY: 2,
        rotateAlways: false,
        hideOverlappingLabels: true,
      },
      axisBorder: {
        show: true,
        color: theme.palette.divider
      },
      axisTicks: {
        show: true,
        color: theme.palette.divider
      },
      tooltip: {
        enabled: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontSize: '12px',
          fontFamily: theme.typography.fontFamily,
        },
        formatter: function(value) {
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
          }
          return value.toFixed(0);
        }
      }
    },
    tooltip: {
      theme: theme.palette.mode,
      style: {
        fontSize: '12px',
        fontFamily: theme.typography.fontFamily
      },
      marker: {
        show: true,
        fillColors: series.map((s, i) => {
          if (s.name.toLowerCase().includes('anomal')) {
            return theme.palette.error.main;
          } else if (i === 0) {
            return theme.palette.primary.main;
          } else {
            return theme.palette.secondary.main;
          }
        }),
      },
      x: {
        show: true,
        format: 'dd MMM',
      },
      y: {
        formatter: function (val) {
          return val.toLocaleString();
        },
        title: {
          formatter: function (seriesName) {
            return seriesName + ': ';
          }
        }
      },
      shared: true,
      intersect: false,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex];
        const name = w.globals.seriesNames[seriesIndex];
        const color = w.globals.colors[seriesIndex];
        const date = w.globals.categoryLabels[dataPointIndex];
        
        return `
          <div class="apexcharts-tooltip-title" style="font-family: ${theme.typography.fontFamily}; font-size: 12px; padding-bottom: 4px; margin-bottom: 4px; border-bottom: 1px solid ${theme.palette.divider}">
            ${date}
          </div>
          <div class="apexcharts-tooltip-series-group" style="padding: 5px; display: flex; align-items: center;">
            <span class="apexcharts-tooltip-marker" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; margin-right: 6px;"></span>
            <span class="apexcharts-tooltip-text" style="display: flex; align-items: center; font-family: ${theme.typography.fontFamily};">
              <span class="apexcharts-tooltip-text-y-label" style="font-weight: 600; margin-right: 4px;">${name}: </span>
              <span class="apexcharts-tooltip-text-y-value">${value.toLocaleString()}</span>
            </span>
          </div>
        `;
      }
    },
    legend: {
      show: false,
      position: 'top',
      horizontalAlign: 'right',
      offsetY: -8,
      fontSize: '13px',
      fontFamily: theme.typography.fontFamily,
      labels: {
        colors: theme.palette.text.primary
      },
      markers: {
        width: 12,
        height: 12,
        radius: 12,
        offsetX: -5
      },
      itemMargin: {
        horizontal: 15
      }
    },
    dataLabels: {
      enabled: false
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: theme.palette.mode,
        type: "vertical",
        shadeIntensity: 0.2,
        opacityFrom: series.map(s => s.name.toLowerCase().includes('anomal') ? 0.2 : 0.5),
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    markers: {
      size: 4,
      colors: series.map((s, i) => {
        if (s.name.toLowerCase().includes('anomal')) {
          return theme.palette.error.main;
        } else if (i === 0) {
          return theme.palette.primary.main;
        } else {
          return theme.palette.secondary.main;
        }
      }),
      strokeColors: theme.palette.background.paper,
      strokeWidth: 2,
      hover: {
        size: 6,
      }
    },
    theme: {
      mode: theme.palette.mode
    },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: {
            toolbar: {
              show: false
            }
          },
          legend: {
            position: 'bottom',
            offsetY: 8
          }
        }
      }
    ]
  };

  return (
    <Box>
      {title && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" component="div" fontWeight="medium" color="text.secondary">
            {title}
          </Typography>
        </Box>
      )}
      <Box sx={{ 
        borderRadius: 3,
        overflow: 'hidden',
        '& .apexcharts-xaxis-label': {
          fill: theme.palette.text.secondary
        }
      }}>
        <Chart
          options={chartOptions}
          series={series}
          type="area"
          height={height}
        />
      </Box>
    </Box>
  );
};

export default LineChart; 