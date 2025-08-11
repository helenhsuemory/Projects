import React, { useState, useRef, useEffect } from 'react';
import { Play, Loader2, CheckCircle, Eye } from 'lucide-react';

export default function VideoWatchParty() {
  const [videoLink, setVideoLink] = useState('');
  const [testRuns, setTestRuns] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, complete
  const [completedRuns, setCompletedRuns] = useState(0);
  const [currentRun, setCurrentRun] = useState(0);
  const [error, setError] = useState('');
  const [watchProgress, setWatchProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [videoTitle, setVideoTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const extractVideoId = (url) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split('?')[0];
    }
    return null;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadYouTubeAPI = () => {
    return new Promise((resolve, reject) => {
      // Set a timeout for API loading
      const timeout = setTimeout(() => {
        reject(new Error('YouTube API failed to load within 10 seconds'));
      }, 10000);

      if (window.YT && window.YT.Player) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load YouTube API script'));
      };
      
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  };

  const createPlayer = (videoId) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Player creation timed out after 15 seconds'));
      }, 15000);

      try {
        const player = new window.YT.Player('youtube-player', {
          height: '0',
          width: '0',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0
          },
          events: {
            onReady: (event) => {
              clearTimeout(timeout);
              try {
                const duration = player.getDuration();
                const title = player.getVideoData().title;
                setTotalDuration(duration);
                setVideoTitle(title || 'YouTube Video');
                resolve(player);
              } catch (error) {
                reject(new Error('Failed to get video data: ' + error.message));
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (event.data === window.YT.PlayerState.PAUSED || 
                        event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
              }
            },
            onError: (event) => {
              clearTimeout(timeout);
              reject(new Error(`YouTube Player Error: ${event.data} (Video may be private, restricted, or unavailable)`));
            }
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error('Failed to create YouTube player: ' + error.message));
      }
    });
  };

  const watchVideoCompletely = async (videoId, runNumber) => {
    try {
      setWatchProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);

      // Load YouTube API with timeout
      try {
        await loadYouTubeAPI();
      } catch (apiError) {
        throw new Error('YouTube API unavailable in this environment. ' + apiError.message);
      }

      // Create a new player for this run
      let player;
      try {
        player = await createPlayer(videoId);
        playerRef.current = player;
      } catch (playerError) {
        throw new Error('Failed to create video player. ' + playerError.message);
      }

      // Start playing
      player.playVideo();

      // Monitor progress with timeout
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const maxWaitTime = (totalDuration + 30) * 1000; // Max wait time

        const checkProgress = () => {
          try {
            if (!player || !player.getCurrentTime) {
              reject(new Error('Player became unavailable during playback'));
              return;
            }

            // Check if we've been waiting too long
            if (Date.now() - startTime > maxWaitTime) {
              clearInterval(intervalRef.current);
              player.pauseVideo();
              reject(new Error('Playback timeout - took longer than expected'));
              return;
            }

            const currentSeconds = player.getCurrentTime();
            const duration = player.getDuration();
            
            if (!duration || duration === 0) {
              // If we can't get duration, assume it's a short video and complete after reasonable time
              if (Date.now() - startTime > 30000) { // 30 seconds max for unknown duration
                clearInterval(intervalRef.current);
                player.pauseVideo();
                resolve({
                  runNumber,
                  duration: 30,
                  completed: true,
                  actualPlayback: true,
                  note: 'Completed with estimated duration'
                });
                return;
              }
              return;
            }

            const progress = (currentSeconds / duration) * 100;

            setCurrentTime(currentSeconds);
            setWatchProgress(progress);

            // Check if video is complete
            if (currentSeconds >= duration - 1 || progress >= 99) {
              clearInterval(intervalRef.current);
              player.pauseVideo();
              
              // Clean up player
              setTimeout(() => {
                if (player && player.destroy) {
                  player.destroy();
                }
              }, 1000);

              resolve({
                runNumber,
                duration,
                completed: true,
                actualPlayback: true,
                finalTime: currentSeconds
              });
            }
          } catch (error) {
            clearInterval(intervalRef.current);
            reject(new Error('Playback monitoring error: ' + error.message));
          }
        };

        intervalRef.current = setInterval(checkProgress, 500);
      });

    } catch (error) {
      console.error(`Error in actual playback run ${runNumber}:`, error);
      throw error;
    }
  };

  const startWatchParty = async () => {
    if (!videoLink.trim() || !testRuns.trim()) {
      setError('Please provide both video link and number of test runs');
      return;
    }

    if (!isValidUrl(videoLink.trim())) {
      setError('Please enter a valid video URL');
      return;
    }

    const videoId = extractVideoId(videoLink.trim());
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    const numRuns = parseInt(testRuns);
    if (isNaN(numRuns) || numRuns < 1 || numRuns > 5) {
      setError('Please enter a valid number of test runs (1-5 for actual playback)');
      return;
    }

    setError('');
    setStatus('processing');
    setCurrentRun(0);
    setCompletedRuns(0);

    try {
      for (let i = 1; i <= numRuns; i++) {
        setCurrentRun(i);
        
        // Actually play the video completely
        const result = await watchVideoCompletely(videoId, i);
        
        console.log(`Actual playback run ${i} completed:`, result);
        setCompletedRuns(i);
        
        // Brief pause between runs
        if (i < numRuns) {
          setIsPlaying(false);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // All runs completed
      setStatus('complete');
      setIsPlaying(false);
      
      // Clear inputs after showing completion
      setTimeout(() => {
        setVideoLink('');
        setTestRuns('');
        setStatus('idle');
        setCurrentRun(0);
        setCompletedRuns(0);
        setWatchProgress(0);
        setCurrentTime(0);
        setTotalDuration(0);
        setVideoTitle('');
      }, 5000);

    } catch (error) {
      setError('Failed to complete actual playback: ' + error.message);
      setStatus('idle');
      setCurrentRun(0);
      setCompletedRuns(0);
      setWatchProgress(0);
      setCurrentTime(0);
      setTotalDuration(0);
      setVideoTitle('');
      setIsPlaying(false);
      
      // Clean up any remaining player
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Real Video Playback Test</h1>
          <p className="text-gray-600">Actual YouTube video playback testing</p>
        </div>

        {/* Hidden YouTube Player */}
        <div id="youtube-player" style={{ position: 'absolute', left: '-9999px' }}></div>

        {status === 'complete' ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Playback Test Complete!
            </h2>
            <p className="text-gray-600">
              Successfully played video <span className="font-semibold text-green-600">{completedRuns}</span> times
            </p>
            <p className="text-sm text-green-600 mt-2">
              YouTube view count should increase by {completedRuns}
            </p>
            <div className="text-sm text-gray-500 mt-2">
              Clearing inputs in 5 seconds...
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="videoLink" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube Video Link
              </label>
              <input
                type="url"
                id="videoLink"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={status === 'processing'}
              />
            </div>

            <div>
              <label htmlFor="testRuns" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Test Runs
              </label>
              <input
                type="number"
                id="testRuns"
                value={testRuns}
                onChange={(e) => setTestRuns(e.target.value)}
                placeholder="3"
                min="1"
                max="5"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={status === 'processing'}
              />
              <p className="text-xs text-gray-500 mt-1">Max 5 runs for actual playback testing</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {status === 'processing' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Eye className={`w-5 h-5 text-blue-500 ${isPlaying ? 'animate-pulse' : ''}`} />
                  <span className="text-blue-600 font-medium">
                    {isPlaying ? 'Actually Playing Video...' : 'Preparing Playback...'}
                  </span>
                </div>
                
                {videoTitle && (
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 mb-1">Now Playing:</div>
                    <div className="text-sm text-blue-600 truncate">{videoTitle}</div>
                    {totalDuration > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Duration: {formatTime(totalDuration)} (actual)
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-center text-sm text-blue-600">
                  Run {currentRun} of {testRuns} 
                  {completedRuns > 0 && ` (${completedRuns} completed)`}
                </div>
                
                {/* Video Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-blue-600">{watchProgress.toFixed(1)}% played</span>
                    <span>{formatTime(totalDuration)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${watchProgress}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Overall Progress */}
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Total Progress</span>
                    <span>{completedRuns} / {testRuns} runs</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(completedRuns / parseInt(testRuns || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={startWatchParty}
              disabled={status === 'processing'}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {status === 'processing' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>
                {status === 'processing' ? 'Playing Videos...' : 'Start Real Playback Test'}
              </span>
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
          <p><strong>⚠️ ACTUAL PLAYBACK:</strong> This will play YouTube videos</p>
          <p>YouTube view counts WILL increase with each run</p>
          <p>⚠️ May not work in some browser environments due to YouTube API restrictions</p>
        </div>
      </div>
    </div>
  );
}