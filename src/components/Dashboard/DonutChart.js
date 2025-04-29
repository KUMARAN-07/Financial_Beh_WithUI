import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';

const DonutChart = ({ title, series, labels, height = 350 }) => {
  const theme = useTheme();
  
  const chartOptions = {
    chart: {
      type: 'donut',
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
      }
    },
    labels: labels,
    colors: [
      theme.palette.info.light, 
      theme.palette.info.dark, 
      theme.palette.primary.dark, 
      theme.palette.secondary.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.success.main,
      theme.palette.grey[400]
    ],
    stroke: {
      width: 2,
      colors: [theme.palette.background.paper]
    },
    plotOptions: {
      pie: {
        donut: {
          size: '50%',
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: false,
              label: 'Total',
              fontSize: '16px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 600,
              color: theme.palette.text.primary,
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              }
            },
            value: {
              show: true,
              fontSize: '22px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 600,
              color: theme.palette.text.primary,
              offsetY: 5,
              formatter: function (val) {
                return val;
              }
            }
          }
        }
      }
    },
    legend: {
      position: 'right',
      fontSize: '14px',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontWeight: 400,
      labels: {
        colors: theme.palette.text.primary
      },
      markers: {
        width: 12,
        height: 12,
        strokeWidth: 0,
        radius: 12,
        offsetX: -5
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    tooltip: {
      theme: theme.palette.mode,
      fillSeriesColor: false,
      style: {
        fontSize: '14px'
      }
    },
    dataLabels: {
      enabled: false
    },
    responsive: [
      {
        breakpoint: 992,
        options: {
          legend: {
            position: 'bottom'
          }
        }
      }
    ],
    theme: {
      mode: theme.palette.mode
    }
  };

  return (
    <Card sx={{ 
      height: '100%', 
      borderRadius: 2,
      boxShadow: theme.shadows[2]
    }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" component="div" fontWeight="medium">
            {title}
          </Typography>
        </Box>
        <Chart
          options={chartOptions}
          series={series}
          type="donut"
          height={height}
        />
      </CardContent>
    </Card>
  );
};

export default DonutChart; 