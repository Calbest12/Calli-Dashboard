import React, { useState, useMemo } from 'react';
import { TrendingUp, Target, AlertCircle, Activity } from 'lucide-react';

/**
 * Career Category Graph - Fixed Version with Consistent Time Filtering
 */
const CareerCategoryGraph = ({ goals = [], completedGoals = [] }) => {
  const [timeFilter, setTimeFilter] = useState('1month');
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });
  const [selectedCategories, setSelectedCategories] = useState(new Set());

  // Category configuration
  const categoryConfig = {
    'technical': { name: 'Technical Skills', color: '#3b82f6' },
    'management': { name: 'Management', color: '#8b5cf6' },
    'communication': { name: 'Communication', color: '#10b981' },
    'design': { name: 'Design', color: '#00ffff' },
    'analytics': { name: 'Data Analytics', color: '#06b6d4' },
    'leadership': { name: 'Leadership', color: '#ff7f50' },
    'business strategy': { name: 'Business Strategy', color: '#adff2f' },
    'team building': { name: 'Team Building', color: '#20b2aa' },
    'innovation': { name: 'Innovation', color: '#ff4500' },
  };

  // Fixed history normalizer
  const normalizeHistory = (goal) => {
    const events = [];

    console.log(`\n🔍 RAW DEBUG for goal: ${goal.title}`);
    console.log('Raw goal_progress_history:', goal.goal_progress_history);

    if (goal.goal_progress_history) {
      let historyArray = goal.goal_progress_history;
      
      if (typeof historyArray === 'string') {
        try {
          historyArray = JSON.parse(historyArray);
        } catch (e) {
          historyArray = [];
        }
      }
      
      if (Array.isArray(historyArray)) {
        console.log('Processing history array:', historyArray);
        for (const event of historyArray) {
          console.log('Raw event:', event);
          const progress = typeof event?.new_progress === 'number' ? event.new_progress : null;
          const dateStr = event?.created_at;
          
          console.log(`Event progress: ${progress}, dateStr: "${dateStr}"`);
          
          if (progress !== null && dateStr) {
            const date = new Date(dateStr);
            console.log(`Parsed date: ${date.toLocaleString()}, Timestamp: ${date.getTime()}`);
            
            if (!isNaN(date)) {
              events.push({ value: Math.max(0, Math.min(100, progress)), date: date });
            }
          }
        }
      }
    }

    // Check for other history formats
    const candidates = [
      { key: 'progress_history', value: goal.progress_history },
      { key: 'progressHistory', value: goal.progressHistory },
      { key: 'history', value: goal.history },
      { key: 'updates', value: goal.updates },
    ];

    for (const candidate of candidates) {
      if (candidate.value && Array.isArray(candidate.value)) {
        for (const event of candidate.value) {
          const progress =
            (typeof event?.new_progress === 'number' ? event.new_progress : null) ??
            (typeof event?.value === 'number' ? event.value : null) ??
            (typeof event?.progress === 'number' ? event.progress : null);
          const dateStr = event?.created_at || event?.date || event?.timestamp || null;
          
          if (progress !== null && dateStr) {
            const date = new Date(dateStr);
            
            if (!isNaN(date)) {
              events.push({ value: Math.max(0, Math.min(100, progress)), date: date });
            }
          }
        }
      }
    }

    // Add completion event if goal is completed
    if (goal.completed_date && goal.status === 'completed') {
      let completedDate = new Date(goal.completed_date);
      
      if (!isNaN(completedDate)) {
        events.push({ value: 100, date: completedDate });
      }
    }

    // Sort by date
    events.sort((a, b) => a.date - b.date);

    // Fallback to current_progress if no history exists
    if (events.length === 0) {
      const currentProgress = typeof goal.current_progress === 'number' ? goal.current_progress : 
                            typeof goal.progress === 'number' ? goal.progress : null;
      const timestamp = goal.updated_at || goal.created_at || null;
      
      if (currentProgress !== null && currentProgress >= 0 && timestamp) {
        const date = new Date(timestamp);
        
        if (!isNaN(date)) {
          events.push({ value: Math.max(0, Math.min(100, currentProgress)), date: date });
        }
      }
    }

    return events;
  };

  // Process data
  const processedData = useMemo(() => {
    const stats = {};
    
    // Initialize categories
    Object.keys(categoryConfig).forEach(key => {
      stats[key] = {
        name: categoryConfig[key].name,
        color: categoryConfig[key].color,
        goals: [],
        total: 0,
        active: 0,
        completed: 0,
        paused: 0,
        totalProgressForAvg: 0,
        goalsWithProgress: 0,
        hasGoals: false,
      };
    });
    
    // Combine all goals
    const allGoals = [...goals];
    (completedGoals || []).forEach(cGoal => {
      if (!allGoals.find(g => g.id === cGoal.id)) {
        allGoals.push(cGoal);
      }
    });
    
    // Process each goal
    for (const goal of allGoals) {
      const category = (goal.category || '').toLowerCase().trim();
      
      console.log(`\n🎯 Processing goal "${goal.title}":`)
      console.log(`  Raw category: "${goal.category}"`)
      console.log(`  Processed category: "${category}"`)
      console.log(`  Category exists in config: ${!!categoryConfig[category]}`)
      
      if (!stats[category]) {
        console.log(`  ❌ Category "${category}" not found in categoryConfig`);
        console.log(`  Available categories:`, Object.keys(categoryConfig));
        continue;
      }

      const history = normalizeHistory(goal);
      const status = (goal.status || '').toLowerCase();

      console.log(`  ✅ Adding to ${category} category`)
      console.log(`  History events: ${history.length}`)
      console.log(`  Status: ${status}`)

      const goalWithHistory = { ...goal, __history: history };
      stats[category].goals.push(goalWithHistory);
      stats[category].total += 1;
      stats[category].hasGoals = true;

      // Count by status
      if (status === 'completed') {
        stats[category].completed += 1;
      } else if (status === 'paused') {
        stats[category].paused += 1;
      } else {
        stats[category].active += 1;
      }

      // Calculate progress for average
      let progressValue = 0;
      let hasProgressData = false;

      if (history.length > 0) {
        progressValue = history[history.length - 1].value;
        hasProgressData = true;
      } else if (typeof goal.current_progress === 'number') {
        progressValue = goal.current_progress;
        hasProgressData = true;
      } else if (typeof goal.progress === 'number') {
        progressValue = goal.progress;
        hasProgressData = true;
      }

      if (hasProgressData) {
        stats[category].totalProgressForAvg += progressValue;
        stats[category].goalsWithProgress += 1;
      }
    }

    // Calculate averages
    Object.entries(stats).forEach(([key, cat]) => {
      cat.avgProgress = cat.goalsWithProgress > 0 
        ? Math.round(cat.totalProgressForAvg / cat.goalsWithProgress) 
        : 0;
    });

    return stats;
  }, [goals, completedGoals]);

  // FIXED: Consistent time axis generation
  const timeAxisConfig = useMemo(() => {
    const now = new Date();
    
    switch (timeFilter) {
      case '1hour':
        return {
          points: 13,
          getDate: (i) => {
            const d = new Date(now);
            d.setMinutes(now.getMinutes() - 60 + (i * 5), 0, 0);
            return d;
          },
          formatLabel: (d) => {
            const min = d.getMinutes();
            const hr = d.getHours();
            const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
            return `${h12}:${min.toString().padStart(2, '0')}${hr >= 12 ? 'pm' : 'am'}`;
          },
          periodDuration: 5 * 60 * 1000 // 5 minutes in milliseconds
        };
      case '24hours':
        return {
          points: 24,
          getDate: (i) => {
            const d = new Date(now);
            d.setHours(now.getHours() - 23 + i, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => {
            const hr = d.getHours();
            const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
            return `${h12}${hr >= 12 ? 'pm' : 'am'}`;
          },
          periodDuration: 60 * 60 * 1000 // 1 hour in milliseconds
        };
      case '1week':
        return {
          points: 7,
          getDate: (i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - 6 + i);
            d.setHours(0, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => d.toLocaleDateString('en-US', { weekday: 'short' }),
          periodDuration: 24 * 60 * 60 * 1000 // 1 day in milliseconds
        };
      case '1month':
        return {
          points: 30,
          getDate: (i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - 29 + i);
            d.setHours(0, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          periodDuration: 24 * 60 * 60 * 1000 // 1 day in milliseconds
        };
      case '12months':
      default:
        return {
          points: 12,
          getDate: (i) => {
            const d = new Date(now);
            d.setMonth(now.getMonth() - 11 + i, 1);
            d.setHours(0, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => d.toLocaleDateString('en-US', { month: 'short' }),
          periodDuration: 30 * 24 * 60 * 60 * 1000 // Approximately 1 month in milliseconds
        };
    }
  }, [timeFilter]);

  const timeAxis = useMemo(() => {
    const points = [];
    for (let i = 0; i < timeAxisConfig.points; i++) {
      const date = timeAxisConfig.getDate(i);
      points.push({ 
        date, 
        label: timeAxisConfig.formatLabel(date),
        index: i
      });
    }
    return points;
  }, [timeAxisConfig]);

  // FIXED: Consistent progress events generation
  const progressEvents = useMemo(() => {
    const categoryTimeline = {};

    Object.entries(processedData).forEach(([catKey, cat]) => {
      categoryTimeline[catKey] = [];
      
      if (!cat.hasGoals) {
        console.log(`❌ Skipping ${catKey} - no goals`);
        return;
      }

      console.log(`\n📊 PROGRESS EVENTS DEBUG for ${cat.name} (${catKey}):`);
      console.log(`Goals in category: ${cat.goals.length}`);

      // Collect ALL progress events from ALL goals in this category
      const allEvents = [];
      for (const goal of cat.goals) {
        const history = goal.__history;
        console.log(`Goal "${goal.title}" history:`, history?.length || 0, 'events');
        if (!history || history.length === 0) continue;

        history.forEach(event => {
          console.log(`Adding event: ${event.value}% at ${event.date.toLocaleString()} (${event.date.getTime()})`);
          allEvents.push({
            date: event.date,
            value: event.value,
            goalId: goal.id,
            goalTitle: goal.title
          });
        });
      }

      console.log(`Total events collected for ${cat.name}: ${allEvents.length}`);
      
      if (allEvents.length === 0) {
        console.log(`❌ No events found for ${cat.name} - category will not appear on chart`);
        return;
      }
      
      // FIXED: Use consistent time periods for all filters
      const timeRangeStart = timeAxis[0].date;
      const timeRangeEnd = timeAxis[timeAxis.length - 1].date;
      
      console.log(`Sampling ${cat.name} for time range: ${timeRangeStart.toLocaleString()} to ${timeRangeEnd.toLocaleString()}`);

      // Sample at each time axis point
      timeAxis.forEach((axisPoint, index) => {
        const periodStart = axisPoint.date;
        const periodEnd = new Date(periodStart.getTime() + timeAxisConfig.periodDuration);

        // Find events that occurred during this period
        const eventsInPeriod = allEvents.filter(event => 
          event.date >= periodStart && event.date < periodEnd
        );

        // Only create a point if there was activity during this period
        if (eventsInPeriod.length === 0) {
          console.log(`No activity in ${cat.name} during period ${periodStart.toLocaleString()} to ${periodEnd.toLocaleString()}`);
          return;
        }

        // Find all events that happened up to the end of this period
        const eventsUpToPeriod = allEvents.filter(event => event.date <= periodEnd);
        
        if (eventsUpToPeriod.length === 0) return;

        // Group by goal to get the latest progress for each goal
        const goalProgresses = {};
        eventsUpToPeriod.forEach(event => {
          goalProgresses[event.goalId] = event.value;
        });

        // Calculate category average
        const progressValues = Object.values(goalProgresses);
        if (progressValues.length === 0) return;
        
        const avgProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
        
        console.log(`✅ Activity in ${cat.name} during period ${periodStart.toLocaleString()} to ${periodEnd.toLocaleString()}: ${eventsInPeriod.length} updates, avg = ${Math.round(avgProgress)}%`);

        // Use the period start time for consistency across all filters
        categoryTimeline[catKey].push({
          date: axisPoint.date,
          value: Math.round(avgProgress),
          goalCount: Object.keys(goalProgresses).length,
          goalTitles: eventsInPeriod.map(e => e.goalTitle),
          updatesInPeriod: eventsInPeriod.length,
          periodStart: periodStart,
          periodEnd: periodEnd
        });
      });

      // Sort by date
      categoryTimeline[catKey].sort((a, b) => a.date - b.date);
    });

    return categoryTimeline;
  }, [processedData, timeAxis, timeAxisConfig]);

  // Time series data for chart
  const timeSeriesData = useMemo(() => {
    return timeAxis.map((point, i) => ({ ...point, index: i }));
  }, [timeAxis]);

  // Insights calculation
  const insights = useMemo(() => {
    const results = [];
    const cats = Object.values(processedData).filter(c => c.hasGoals);
    if (cats.length === 0) return results;

    const totalActive = cats.reduce((s, c) => s + c.active, 0);
    const totalCompleted = cats.reduce((s, c) => s + c.completed, 0);

    // Find categories needing attention
    const lowProgress = cats.filter(c => c.active > 0 && c.avgProgress < 30).sort((a, b) => a.avgProgress - b.avgProgress);
    if (lowProgress.length > 0) {
      const weakest = lowProgress[0];
      results.push({
        type: 'warning',
        message: `${weakest.name} needs focus (${weakest.avgProgress}%)`
      });
    }

    // High performers
    const highProgress = cats.filter(c => c.avgProgress > 70);
    if (highProgress.length > 0) {
      const best = highProgress.reduce((p, c) => (c.avgProgress > p.avgProgress ? c : p));
      if (best.completed > 0) {
        results.push({ type: 'success', message: `${best.name} excelling at ${best.avgProgress}% with ${best.completed} completed!` });
      } else {
        results.push({ type: 'success', message: `${best.name} leading at ${best.avgProgress}% - close to first completion!` });
      }
    }

    // Workload management
    if (totalActive > 10) {
      results.push({ type: 'warning', message: `${totalActive} active goals is ambitious - focus on fewer for impact` });
    } else {
      const completionRate = (totalActive + totalCompleted) > 0
        ? Math.round((totalCompleted / (totalActive + totalCompleted)) * 100)
        : 0;
      results.push({ type: 'info', message: `${completionRate}% completion rate, ${totalActive} goals in progress` });
    }

    return results.slice(0, 4);
  }, [processedData]);

  // Initialize selected categories
  React.useEffect(() => {
    if (selectedCategories.size === 0) {
      const categoriesWithGoals = Object.entries(processedData)
        .filter(([_, cat]) => cat.hasGoals)
        .map(([key, _]) => key);
      setSelectedCategories(new Set(categoriesWithGoals));
    }
  }, [processedData]);

  // Toggle category selection
  const toggleCategory = (categoryKey) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryKey)) {
      newSelected.delete(categoryKey);
    } else {
      newSelected.add(categoryKey);
    }
    setSelectedCategories(newSelected);
  };

  // Select/Deselect all categories
  const toggleAllCategories = () => {
    const categoriesWithGoals = Object.entries(processedData)
      .filter(([_, cat]) => cat.hasGoals)
      .map(([key, _]) => key);
    
    if (selectedCategories.size === categoriesWithGoals.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categoriesWithGoals));
    }
  };

  const hasAnyGoals = Object.values(processedData).some(cat => cat.hasGoals);
  
  if (!hasAnyGoals) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <Activity size={48} style={{ color: '#9ca3af', margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
          No Category Data Yet
        </h3>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
          Start adding goals to see category progress trends
        </p>
      </div>
    );
  }

  // Chart dimensions
  const chartWidth = 760;
  const chartHeight = 250;
  const marginLeft = 60;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 40;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      padding: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <TrendingUp size={20} />
          Category Progress Over Time
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Track progress trends across your skill categories
        </p>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <h4 style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            color: '#374151' 
          }}>
            Show Categories:
          </h4>
          <button
            onClick={toggleAllCategories}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#3b82f6',
              color: 'white',
              transition: 'all 0.2s'
            }}
          >
            {selectedCategories.size === Object.values(processedData).filter(cat => cat.hasGoals).length 
              ? 'Hide All' 
              : 'Show All'
            }
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.75rem' 
        }}>
          {Object.entries(processedData)
            .filter(([_, cat]) => cat.hasGoals)
            .map(([catKey, category]) => {
              const isSelected = selectedCategories.has(catKey);
              return (
                <label
                  key={catKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    border: '2px solid #e5e7eb',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? category.color : '#f9fafb',
                    color: isSelected ? 'white' : '#374151',
                    transition: 'all 0.2s',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(catKey)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: isSelected ? 'white' : category.color,
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontWeight: '600' }}>
                    {category.name}
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    opacity: 0.8,
                    fontWeight: '400'
                  }}>
                    ({category.total})
                  </span>
                </label>
              );
            })
          }
        </div>
      </div>

      {/* Time Filter Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { value: '1hour', label: 'Last Hour' },
          { value: '24hours', label: 'Last 24 Hours' },
          { value: '1week', label: 'Past Week' },
          { value: '1month', label: 'Past Month' },
          { value: '12months', label: 'Past Year' }
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTimeFilter(filter.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: timeFilter === filter.value ? '#3b82f6' : '#f3f4f6',
              color: timeFilter === filter.value ? 'white' : '#374151',
              transition: 'all 0.2s'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Line Chart */}
      <div style={{ position: 'relative', marginBottom: '2rem', overflowX: 'auto' }}>
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ minWidth: chartWidth }}
          onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
        >
          {/* Y grid + labels */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = marginTop + plotHeight - (value / 100 * plotHeight);
            return (
              <g key={value}>
                <line
                  x1={marginLeft}
                  y1={y}
                  x2={marginLeft + plotWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray={value === 0 ? "0" : "3,3"}
                />
                <text
                  x={marginLeft - 10}
                  y={y + 5}
                  fill="#6b7280"
                  fontSize="12"
                  textAnchor="end"
                >
                  {value}%
                </text>
              </g>
            );
          })}

          {/* X axis */}
          <line
            x1={marginLeft}
            y1={marginTop + plotHeight}
            x2={marginLeft + plotWidth}
            y2={marginTop + plotHeight}
            stroke="#e5e7eb"
          />

          {/* Lines and dots per category */}
          {Object.entries(processedData).map(([catKey, category]) => {
            if (!category.hasGoals || !selectedCategories.has(catKey)) return null;

            const categoryEvents = progressEvents[catKey] || [];
            
            if (categoryEvents.length === 0) return null;

            // Convert to chart coordinates based on time axis
            const chartPoints = categoryEvents.map(event => {
              // Find the corresponding time axis index
              const axisIndex = timeAxis.findIndex(axis => 
                Math.abs(axis.date.getTime() - event.date.getTime()) < 1000 // within 1 second
              );
              
              if (axisIndex === -1) return null;
              
              const x = marginLeft + (axisIndex / (timeAxis.length - 1)) * plotWidth;
              const y = marginTop + plotHeight - (event.value / 100 * plotHeight);
              
              return { ...event, x, y, axisIndex };
            }).filter(Boolean);

            if (chartPoints.length === 0) return null;

            // Create path for lines
            let pathData = '';
            if (chartPoints.length >= 2) {
              pathData = chartPoints.map((point, idx) => 
                `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
              ).join(' ');
            }

            return (
              <g key={catKey}>
                {/* Draw connecting lines */}
                {chartPoints.length >= 2 && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={category.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8"
                  />
                )}
                
                {/* Draw dots */}
                {chartPoints.map((point, i) => (
                  <circle
                    key={`${catKey}-${i}`}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={category.color}
                    stroke="white"
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                      setTooltip({
                        show: true,
                        x: e.clientX - rect.left + 10,
                        y: e.clientY - rect.top - 10,
                        content: `${category.name}: ${point.value}% average on ${point.date.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: timeFilter === '1hour' || timeFilter === '24hours' ? 'numeric' : undefined,
                          minute: timeFilter === '1hour' ? '2-digit' : undefined,
                          hour12: timeFilter === '1hour' || timeFilter === '24hours' ? true : undefined
                        })} (${point.updatesInPeriod} updates)`
                      });
                    }}
                    onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
                  />
                ))}
              </g>
            );
          })}

          {/* X labels */}
          {timeSeriesData.map((pt, i) => {
            const show =
              timeFilter === '1hour' ? i % 2 === 0 :
              timeFilter === '24hours' ? i % 4 === 0 :
              timeFilter === '1week' ? true :
              timeFilter === '1month' ? i % 5 === 0 :
              i % 2 === 0;
            if (!show) return null;
            const x = marginLeft + (i / (timeSeriesData.length - 1)) * plotWidth;
            return (
              <text
                key={i}
                x={x}
                y={marginTop + plotHeight + 20}
                fill="#6b7280"
                fontSize="11"
                textAnchor="middle"
              >
                {pt.label}
              </text>
            );
          })}
        </svg>
        
        {/* Tooltip */}
        {tooltip.show && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem'
      }}>
        {Object.entries(processedData).map(([catKey, category]) => (
          <div
            key={catKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: category.hasGoals ? (selectedCategories.has(catKey) ? 1 : 0.4) : 0.2
            }}
          >
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: category.color,
              opacity: selectedCategories.has(catKey) ? 1 : 0.4
            }} />
            <span style={{ 
              fontSize: '0.875rem', 
              color: selectedCategories.has(catKey) ? '#374151' : '#9ca3af', 
              fontWeight: category.hasGoals ? '500' : '400' 
            }}>
              {category.name}
              {category.hasGoals
                ? <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 4 }}>
                    ({category.total} {category.total === 1 ? 'goal' : 'goals'})
                  </span>
                : <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
                    (no goals)
                  </span>}
            </span>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
            {Object.values(processedData).reduce((sum, cat) => sum + cat.active, 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Active Goals
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
            {Object.values(processedData).reduce((sum, cat) => sum + cat.completed, 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Completed
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
            {(() => {
              const withData = Object.values(processedData).filter(cat =>
                cat.hasGoals && cat.goalsWithProgress > 0
              );
              return withData.length > 0
                ? Math.round(withData.reduce((s, c) => s + c.avgProgress, 0) / withData.length) + '%'
                : '0%';
            })()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Avg Progress
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8b5cf6' }}>
            {Object.values(processedData).filter(cat => cat.hasGoals).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Categories
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div style={{
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
          }}>
            <Activity size={14} />
            Key Insights
          </h4>
          {insights.map((insight, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: index < insights.length - 1 ? '0.375rem' : 0
            }}>
              {insight.type === 'warning' && <AlertCircle size={14} style={{ color: '#f59e0b' }} />}
              {insight.type === 'success' && <Target size={14} style={{ color: '#10b981' }} />}
              {insight.type === 'info' && <TrendingUp size={14} style={{ color: '#3b82f6' }} />}
              <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                {insight.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerCategoryGraph;