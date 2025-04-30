import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';

const DonutChart = ({ title, series, labels, height = 350 }) => {
  const theme = useTheme();
  
  // Generate a gradient palette based on theme
  const generateGradientColors = () => {
    const baseColors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.primary.light,
      theme.palette.secondary.light,
    ];
    
    // Ensure we have enough colors for all categories
    while (baseColors.length < labels.length) {
      baseColors.push(
        theme.palette.grey[500], 
        theme.palette.grey[700],
        theme.palette.primary.dark,
        theme.palette.secondary.dark
      );
    }
    
    return baseColors.slice(0, labels.length);
  };
  
  const chartOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
      fontFamily: theme.typography.fontFamily,
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
      dropShadow: {
        enabled: true,
        top: 3,
        left: 1,
        blur: 5,
        opacity: 0.2,
        color: theme.palette.mode === 'dark' ? '#000' : '#555'
      }
    },
    labels: labels,
    colors: generateGradientColors(),
    stroke: {
      width: 2,
      colors: [theme.palette.background.paper]
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: theme.palette.mode === 'dark' ? 'dark' : 'light',
        shadeIntensity: 0.2,
        gradientToColors: undefined,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.8,
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          background: 'transparent',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontFamily: theme.typography.fontFamily,
              fontWeight: 500,
              color: theme.palette.text.secondary,
              offsetY: -10,
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total',
              fontSize: '16px',
              fontFamily: theme.typography.fontFamily,
              fontWeight: 600,
              color: theme.palette.text.primary,
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString();
              }
            },
            value: {
              show: true,
              fontSize: '24px',
              fontFamily: theme.typography.fontFamily,
              fontWeight: 600,
              color: theme.palette.primary.main,
              offsetY: 6,
              formatter: function (val) {
                return val.toLocaleString();
              }
            }
          }
        },
        customScale: 1,
        offsetX: 0,
        offsetY: 0,
      }
    },
    legend: {
      show: false, // Hide default legend as we'll show top categories below the chart
      position: 'bottom',
      fontSize: '13px',
      fontFamily: theme.typography.fontFamily,
      fontWeight: 400,
      markers: {
        width: 10,
        height: 10,
        strokeWidth: 0,
        radius: 6,
        offsetX: -5
      },
      itemMargin: {
        horizontal: 10,
        vertical: 3
      }
    },
    tooltip: {
      theme: theme.palette.mode,
      fillSeriesColor: false,
      style: {
        fontSize: '13px',
        fontFamily: theme.typography.fontFamily
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex];
        const name = w.globals.labels[seriesIndex];
        const color = w.globals.colors[seriesIndex];
        const total = series.reduce((a, b) => a + b, 0);
        const percentage = ((value / total) * 100).toFixed(1);
        
        return `
          <div class="apexcharts-tooltip-box" style="padding: 8px; font-family: ${theme.typography.fontFamily}; box-shadow: 0 5px 10px rgba(0,0,0,0.2); border-radius: 6px;">
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; margin-right: 6px;"></span>
              <span style="font-weight: 600; font-size: 14px;">${name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <span style="font-weight: 600; color: ${color};">${percentage}%</span>
              <span style="font-weight: 500;">${value.toLocaleString()} transactions</span>
            </div>
          </div>
        `;
      }
    },
    dataLabels: {
      enabled: false,
      style: {
        fontSize: '12px',
        fontFamily: theme.typography.fontFamily,
        fontWeight: 500,
        colors: [theme.palette.background.paper]
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 3,
        opacity: 0.5
      }
    },
    responsive: [
      {
        breakpoint: 992,
        options: {
          chart: {
            height: 300
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    ],
    states: {
      hover: {
        filter: {
          type: 'darken',
          value: 0.9
        }
      },
      active: {
        filter: {
          type: 'darken',
          value: 0.85
        }
      }
    },
    theme: {
      mode: theme.palette.mode
    }
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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Chart
          options={chartOptions}
          series={series}
          type="donut"
          height={height}
        />
      </Box>
    </Box>
  );
};

export default DonutChart; 