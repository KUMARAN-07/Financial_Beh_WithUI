import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';

const LineChart = ({ title, series, xaxis, height = 350 }) => {
  const theme = useTheme();
  
  const chartOptions = {
    chart: {
      type: 'line',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
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
      dropShadow: {
        enabled: true,
        top: 5,
        left: 0,
        blur: 3,
        opacity: 0.2
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
    },
    grid: {
      borderColor: theme.palette.divider,
      row: {
        colors: [theme.palette.background.default, 'transparent'],
        opacity: 0.5
      }
    },
    xaxis: {
      categories: xaxis,
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        }
      },
      axisBorder: {
        show: true,
        color: theme.palette.divider
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
        }
      }
    },
    tooltip: {
      theme: theme.palette.mode,
      y: {
        formatter: function (val) {
          return val;
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: theme.palette.text.secondary
      }
    },
    dataLabels: {
      enabled: false
    },
    fill: {
      opacity: 0.1,
      type: 'solid'
    },
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
          type="line"
          height={height}
        />
      </CardContent>
    </Card>
  );
};

export default LineChart; 