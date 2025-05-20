import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { 
  IPTVStream, 
  StreamStats, 
  SystemStats, 
  LogEntry, 
  CategoryStats
} from './types';

// Path for storing stream data and logs
const DATA_DIR = path.join(process.cwd(), 'data');
const STREAMS_FILE = path.join(DATA_DIR, 'streams.json');
const STREAM_LOGS_DIR = path.join(DATA_DIR, 'logs');
const STREAM_SCRIPTS_DIR = path.join(DATA_DIR, 'scripts');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STREAM_LOGS_DIR)) {
  fs.mkdirSync(STREAM_LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(STREAM_SCRIPTS_DIR)) {
  fs.mkdirSync(STREAM_SCRIPTS_DIR, { recursive: true });
}

// Initialize streams file if it doesn't exist
if (!fs.existsSync(STREAMS_FILE)) {
  fs.writeFileSync(STREAMS_FILE, JSON.stringify([], null, 2));
}

// Stream Management Functions
export async function getAllStreams(): Promise<IPTVStream[]> {
  try {
    const data = fs.readFileSync(STREAMS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading streams file:', error);
    return [];
  }
}

export async function getStreamById(id: string): Promise<IPTVStream | undefined> {
  const streams = await getAllStreams();
  return streams.find(stream => stream.id === id);
}

export async function addStream(streamData: Omit<IPTVStream, 'id' | 'createdAt' | 'updatedAt' | 'active'>): Promise<IPTVStream> {
  const streams = await getAllStreams();
  const now = Date.now();
  
  const newStream: IPTVStream = {
    ...streamData,
    id: crypto.randomUUID(),
    active: false,
    createdAt: now,
    updatedAt: now
  };
  
  streams.push(newStream);
  fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams, null, 2));
  
  // Create log file and stream script
  createLogFile(newStream.id);
  createStreamScript(newStream);
  
  return newStream;
}

export async function updateStream(id: string, streamData: Partial<IPTVStream>): Promise<IPTVStream | undefined> {
  const streams = await getAllStreams();
  const index = streams.findIndex(stream => stream.id === id);
  
  if (index === -1) return undefined;
  
  const updatedStream = {
    ...streams[index],
    ...streamData,
    updatedAt: Date.now()
  };
  
  streams[index] = updatedStream;
  fs.writeFileSync(STREAMS_FILE, JSON.stringify(streams, null, 2));
  
  // Update stream script if relevant fields were changed
  if (streamData.link1 || streamData.rtmp || streamData.key || streamData.bitrate || streamData.resolution) {
    createStreamScript(updatedStream);
  }
  
  return updatedStream;
}

export async function deleteStream(id: string): Promise<boolean> {
  // First stop the stream if it's running
  await stopStream(id);
  
  const streams = await getAllStreams();
  const filteredStreams = streams.filter(stream => stream.id !== id);
  
  if (filteredStreams.length === streams.length) {
    return false; // Stream not found
  }
  
  fs.writeFileSync(STREAMS_FILE, JSON.stringify(filteredStreams, null, 2));
  
  // Delete associated files
  const scriptFile = path.join(STREAM_SCRIPTS_DIR, `${id}.sh`);
  const logFile = path.join(STREAM_LOGS_DIR, `${id}.log`);
  
  if (fs.existsSync(scriptFile)) {
    fs.unlinkSync(scriptFile);
  }
  
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
  
  return true;
}

// Stream Operation Functions
export async function startStream(id: string): Promise<boolean> {
  const stream = await getStreamById(id);
  if (!stream) return false;
  
  if (stream.active) {
    // Already running, no need to start again
    return true;
  }
  
  try {
    const isWindows = process.platform === 'win32';
    const scriptPath = path.join(STREAM_SCRIPTS_DIR, `${id}.sh`);
    const logPath = path.join(STREAM_LOGS_DIR, `${id}.log`);
    
    if (isWindows) {
      // Windows implementation
      const ffmpegCmd = `ffmpeg -re -i "${stream.link1}" -vcodec libx264 -preset veryfast -tune zerolatency -s ${stream.resolution} -b:v ${stream.bitrate} -maxrate ${stream.bitrate} -acodec aac -b:a 56k -sc_threshold 0 -g 48 -keyint_min 48 -x264opts no-scenecut -ar 48000 -bufsize 1600k -ab 96k -f flv "${stream.rtmp}/${stream.key}"`;
      
      const child = spawn('cmd.exe', ['/c', 'start', '/b', 'cmd', '/c', ffmpegCmd + ` > ${logPath} 2>&1`], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      
      child.unref();
    } else {
      // Linux/Mac implementation
      const child = spawn('sh', [scriptPath, stream.link1, `${stream.rtmp}`], {
        detached: true,
        stdio: 'ignore'
      });
      
      child.unref();
    }
    
    // Mark stream as active in our database
    await updateStream(id, { active: true });
    
    // Log the action
    await appendToLog(id, {
      timestamp: Date.now(),
      message: `Stream started`,
      type: 'info'
    });
    
    return true;
  } catch (error) {
    console.error(`Error starting stream ${id}:`, error);
    
    // Log the error
    await appendToLog(id, {
      timestamp: Date.now(),
      message: `Failed to start stream: ${error}`,
      type: 'error'
    });
    
    return false;
  }
}

export async function stopStream(id: string): Promise<boolean> {
  const stream = await getStreamById(id);
  if (!stream) return false;
  
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows implementation using taskkill
      execSync(`taskkill /F /FI "WINDOWTITLE eq *${stream.link1}*" /T`);
      execSync(`taskkill /F /FI "COMMANDLINE eq *${stream.link1}*" /T`);
    } else {
      // Linux/Mac implementation using pkill
      execSync(`pkill -f "${stream.link1}"`);
    }
    
    // Mark stream as inactive
    await updateStream(id, { active: false });
    
    // Log the action
    await appendToLog(id, {
      timestamp: Date.now(),
      message: `Stream stopped`,
      type: 'info'
    });
    
    return true;
  } catch (error) {
    console.error(`Error stopping stream ${id}:`, error);
    
    // Log the error, but still mark as inactive since the command might have partially worked
    await appendToLog(id, {
      timestamp: Date.now(),
      message: `Error while stopping stream: ${error}`,
      type: 'warning'
    });
    
    // Mark as inactive anyway
    await updateStream(id, { active: false });
    
    return true; // Return true since we marked it as inactive
  }
}

export async function restartStream(id: string): Promise<boolean> {
  // Stop first
  await stopStream(id);
  
  // Small delay to ensure process is fully stopped
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Then start
  return startStream(id);
}

// Log Functions
export async function getStreamLogs(id: string, limit = 100): Promise<LogEntry[]> {
  const logFile = path.join(STREAM_LOGS_DIR, `${id}.log`);
  
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(logFile, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const logs: LogEntry[] = [];
    
    // Parse log entries, handling the most recent ones first
    for (let i = lines.length - 1; i >= 0 && logs.length < limit; i--) {
      try {
        const log = JSON.parse(lines[i]);
        logs.push(log);
      } catch (e) {
        // Skip invalid JSON entries
      }
    }
    
    return logs;
  } catch (error) {
    console.error(`Error reading logs for stream ${id}:`, error);
    return [];
  }
}

export async function clearStreamLogs(id: string): Promise<boolean> {
  const logFile = path.join(STREAM_LOGS_DIR, `${id}.log`);
  
  if (!fs.existsSync(logFile)) {
    return false;
  }
  
  try {
    fs.writeFileSync(logFile, '');
    return true;
  } catch (error) {
    console.error(`Error clearing logs for stream ${id}:`, error);
    return false;
  }
}

// Helper Functions
function createLogFile(id: string): void {
  const logFile = path.join(STREAM_LOGS_DIR, `${id}.log`);
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
  }
}

function createStreamScript(stream: IPTVStream): void {
  const scriptFile = path.join(STREAM_SCRIPTS_DIR, `${stream.id}.sh`);
  
  const scriptContent = `#!/bin/bash
log_file="${path.join(STREAM_LOGS_DIR, stream.id + '.log')}"
input_url="${stream.link1}"
rtmp_url="${stream.rtmp}/${stream.key}"
bitrate="${stream.bitrate}"
resolution="${stream.resolution}"

while true; do
  ffmpeg -re -i "$input_url" -vcodec libx264 -preset veryfast -tune zerolatency -s "$resolution" \\
    -b:v "$bitrate" -maxrate "$bitrate" -acodec aac -b:a 56k -sc_threshold 0 -g 48 \\
    -keyint_min 48 -x264opts no-scenecut -ar 48000 -bufsize 1600k -ab 96k \\
    -f flv "$rtmp_url" >> "$log_file" 2>&1
  
  # Wait a bit before retrying to avoid CPU overload on constant failures
  sleep 1
done`;
  
  fs.writeFileSync(scriptFile, scriptContent);
  fs.chmodSync(scriptFile, 0o755); // Make executable
}

async function appendToLog(id: string, entry: LogEntry): Promise<void> {
  const logFile = path.join(STREAM_LOGS_DIR, `${id}.log`);
  
  try {
    // Ensure the log file exists
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '');
    }
    
    // Append the new log entry as JSON
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (error) {
    console.error(`Error appending to log for stream ${id}:`, error);
  }
}

// Statistics Functions
export async function getStreamStats(): Promise<StreamStats> {
  const streams = await getAllStreams();
  const active = streams.filter(stream => stream.active);
  
  // Calculate stream health
  const health = {
    healthy: 0,
    warning: 0,
    error: 0,
    unknown: 0
  };
  
  // Logic for determining stream health based on logs would go here
  // This is a simplified version
  for (const stream of active) {
    const logs = await getStreamLogs(stream.id, 10);
    const hasErrors = logs.some(log => log.type === 'error');
    const hasWarnings = logs.some(log => log.type === 'warning');
    
    if (hasErrors) {
      health.error++;
    } else if (hasWarnings) {
      health.warning++;
    } else if (logs.length > 0) {
      health.healthy++;
    } else {
      health.unknown++;
    }
  }
  
  return {
    total: streams.length,
    active: active.length,
    inactive: streams.length - active.length,
    health
  };
}

export async function getSystemStats(): Promise<SystemStats> {
  try {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';
    
    let cpu = '0 %';
    let memTotal = 0;
    let memUsed = 0;
    let memFree = 0;
    let diskTotal = 0;
    let diskUsed = 0;
    let diskFree = 0;
    let uptimeString = '';
    
    if (isWindows) {
      // Windows implementation using built-in commands
      try {
        // Get CPU usage
        const cpuOutput = execSync('wmic cpu get loadpercentage').toString().trim();
        const cpuMatch = cpuOutput.match(/\d+/);
        if (cpuMatch) {
          cpu = `${cpuMatch[0]} %`;
        }
        
        // Get memory info
        const memoryOutput = execSync('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value').toString();
        const totalMemoryMatch = memoryOutput.match(/TotalVisibleMemorySize=(\d+)/);
        const freeMemoryMatch = memoryOutput.match(/FreePhysicalMemory=(\d+)/);
        
        if (totalMemoryMatch && freeMemoryMatch) {
          memTotal = parseInt(totalMemoryMatch[1]) / 1024; // Convert KB to MB
          memFree = parseInt(freeMemoryMatch[1]) / 1024; // Convert KB to MB
          memUsed = memTotal - memFree;
        }
        
        // Get disk info
        const diskOutput = execSync('wmic logicaldisk where DeviceID="C:" get Size,FreeSpace /Value').toString();
        const totalDiskMatch = diskOutput.match(/Size=(\d+)/);
        const freeDiskMatch = diskOutput.match(/FreeSpace=(\d+)/);
        
        if (totalDiskMatch && freeDiskMatch) {
          diskTotal = parseInt(totalDiskMatch[1]) / (1024 * 1024 * 1024); // Convert bytes to GB
          diskFree = parseInt(freeDiskMatch[1]) / (1024 * 1024 * 1024); // Convert bytes to GB
          diskUsed = diskTotal - diskFree;
        }
        
        // Get uptime
        const uptimeOutput = execSync('net statistics server | find "Statistics since"').toString();
        if (uptimeOutput) {
          uptimeString = uptimeOutput.replace('Statistics since', '').trim();
        } else {
          // Fallback to system uptime if server statistics aren't available
          const uptimeSeconds = Math.floor(require('os').uptime());
          uptimeString = formatUptime(uptimeSeconds);
        }
      } catch (error) {
        console.error('Error fetching Windows system stats:', error);
      }
    } else if (isMac || isLinux) {
      // Unix-based implementation
      try {
        // Get CPU usage using 'top' command
        const cpuOutput = isMac 
          ? execSync("top -l 1 | grep 'CPU usage'").toString()
          : execSync("top -b -n 1 | grep '%Cpu'").toString();
        
        const cpuMatch = cpuOutput.match(/(\d+\.\d+)%\s+user/);
        if (cpuMatch) {
          cpu = `${cpuMatch[1]} %`;
        }
        
        // Get memory info using 'free' command on Linux or 'vm_stat' on Mac
        if (isMac) {
          const memOutput = execSync('vm_stat').toString();
          const pageSize = 4096; // Default page size on macOS
          const matches = {
            total: memOutput.match(/Pages free:\s+(\d+)/),
            active: memOutput.match(/Pages active:\s+(\d+)/),
            inactive: memOutput.match(/Pages inactive:\s+(\d+)/),
            speculative: memOutput.match(/Pages speculative:\s+(\d+)/),
            wired: memOutput.match(/Pages wired down:\s+(\d+)/)
          };
          
          if (matches.total && matches.active && matches.inactive && matches.speculative && matches.wired) {
            const free = parseInt(matches.total[1]) * pageSize;
            const active = parseInt(matches.active[1]) * pageSize;
            const inactive = parseInt(matches.inactive[1]) * pageSize;
            const speculative = parseInt(matches.speculative[1]) * pageSize;
            const wired = parseInt(matches.wired[1]) * pageSize;
            
            memTotal = (free + active + inactive + speculative + wired) / (1024 * 1024); // Convert bytes to MB
            memFree = free / (1024 * 1024); 
            memUsed = memTotal - memFree;
          }
        } else {
          // Linux
          const memOutput = execSync('free -m').toString();
          const memMatch = memOutput.match(/Mem:\s+(\d+)\s+(\d+)\s+(\d+)/);
          
          if (memMatch) {
            memTotal = parseInt(memMatch[1]);
            memUsed = parseInt(memMatch[2]);
            memFree = parseInt(memMatch[3]);
          }
        }
        
        // Get disk info
        const diskOutput = execSync('df -h /').toString();
        const diskMatch = diskOutput.match(/\d+%/);
        const sizeMatch = diskOutput.match(/\d+G/);
        
        if (diskMatch && sizeMatch) {
          const usedPercent = parseInt(diskMatch[0]) / 100;
          diskTotal = parseInt(sizeMatch[0]);
          diskUsed = diskTotal * usedPercent;
          diskFree = diskTotal - diskUsed;
        }
        
        // Get uptime
        const uptimeSeconds = Math.floor(require('os').uptime());
        uptimeString = formatUptime(uptimeSeconds);
      } catch (error) {
        console.error(`Error fetching ${isMac ? 'macOS' : 'Linux'} system stats:`, error);
      }
    } else {
      // Fallback for other platforms: use Node.js os module for basic info
      try {
        const os = require('os');
        
        // Calculate CPU average load
        const cpuLoad = os.loadavg()[0];
        cpu = `${cpuLoad.toFixed(1)} %`;
        
        // Memory info
        memTotal = os.totalmem() / (1024 * 1024); // Convert bytes to MB
        memFree = os.freemem() / (1024 * 1024); // Convert bytes to MB
        memUsed = memTotal - memFree;
        
        // Get uptime
        const uptimeSeconds = Math.floor(os.uptime());
        uptimeString = formatUptime(uptimeSeconds);
      } catch (error) {
        console.error('Error fetching system stats using Node.js os module:', error);
      }
    }
    
    // Calculate percentages
    const memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;
    const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;
    
    return {
      cpu,
      memory: {
        total: Math.round(memTotal),
        used: Math.round(memUsed),
        free: Math.round(memFree),
        percent: memPercent
      },
      disk: {
        total: Math.round(diskTotal),
        used: Math.round(diskUsed),
        free: Math.round(diskFree),
        percent: diskPercent
      },
      uptime: uptimeString
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    
    // Return fallback data if anything goes wrong
    return {
      cpu: '0 %',
      memory: {
        total: 0,
        used: 0,
        free: 0,
        percent: 0
      },
      disk: {
        total: 0,
        used: 0,
        free: 0,
        percent: 0
      },
      uptime: 'Unknown'
    };
  }
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= (24 * 60 * 60);
  const hours = Math.floor(seconds / (60 * 60));
  seconds %= (60 * 60);
  const minutes = Math.floor(seconds / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  return parts.join(', ') || '0 minutes';
}

export async function getCategoryStats(): Promise<CategoryStats[]> {
  const streams = await getAllStreams();
  const categories: Record<string, CategoryStats> = {};
  
  // Group by category and count
  for (const stream of streams) {
    const category = stream.category1 || 'Uncategorized';
    
    if (!categories[category]) {
      categories[category] = {
        name: category,
        total: 0,
        active: 0
      };
    }
    
    categories[category].total++;
    
    if (stream.active) {
      categories[category].active++;
    }
  }
  
  // Convert to array and sort by total count descending
  return Object.values(categories).sort((a, b) => b.total - a.total);
}

/**
 * Get detailed process information for a running stream
 */
export async function getStreamProcessInfo(id: string): Promise<{
  running: boolean;
  pid?: string;
  cpu?: string;
  memory?: string;
  runtime?: string;
  bitrate?: string;
  fps?: string;
}> {
  const stream = await getStreamById(id);
  if (!stream || !stream.active) {
    return { running: false };
  }

  const isWindows = process.platform === 'win32';
  
  try {
    // First, find the process ID
    let pid: string | undefined;
    let processInfo = {
      running: true,
      pid: undefined as string | undefined,
      cpu: '0%',
      memory: '0 MB',
      runtime: '0s',
      bitrate: 'N/A',
      fps: 'N/A'
    };

    if (isWindows) {
      // Windows implementation
      try {
        // Find process by command line
        const cmdOutput = execSync(`wmic process where "commandline like '%${stream.link1}%'" get processid,commandline`).toString();
        const pidMatch = cmdOutput.match(/(\d+)\s*$/m);
        
        if (pidMatch) {
          pid = pidMatch[1];
          processInfo.pid = pid;
          
          // Get CPU and memory usage for the process
          const procInfoOutput = execSync(`wmic process where processid=${pid} get workingsetsize,usermodetime`).toString();
          const memoryMatch = procInfoOutput.match(/(\d+)/);
          const cpuTimeMatch = procInfoOutput.match(/(\d+)\s*$/);
          
          if (memoryMatch) {
            const memoryBytes = parseInt(memoryMatch[1]);
            processInfo.memory = `${Math.round(memoryBytes / (1024 * 1024))} MB`;
          }
          
          if (cpuTimeMatch) {
            // usermodetime is in 100-nanosecond intervals
            // We need to calculate CPU usage as a percentage of time since process start
            const cpuTime = parseInt(cpuTimeMatch[1]) / 10000000; // Convert to seconds
            const uptimeOutput = execSync(`wmic process where processid=${pid} get creationdate`).toString();
            const creationMatch = uptimeOutput.match(/(\d{14})/);
            
            if (creationMatch) {
              const creationTime = new Date(
                parseInt(creationMatch[1].substring(0, 4)),
                parseInt(creationMatch[1].substring(4, 6)) - 1,
                parseInt(creationMatch[1].substring(6, 8)),
                parseInt(creationMatch[1].substring(8, 10)),
                parseInt(creationMatch[1].substring(10, 12)),
                parseInt(creationMatch[1].substring(12, 14))
              );
              
              const elapsedSeconds = (Date.now() - creationTime.getTime()) / 1000;
              if (elapsedSeconds > 0) {
                const cpuUsage = (cpuTime / elapsedSeconds) * 100;
                processInfo.cpu = `${cpuUsage.toFixed(1)}%`;
                processInfo.runtime = formatUptime(elapsedSeconds);
              }
            }
          }
          
          // Try to get FFmpeg stats from log file
          const logFile = path.join(STREAM_LOGS_DIR, `${id}.log`);
          if (fs.existsSync(logFile)) {
            const logData = fs.readFileSync(logFile, 'utf8');
            const lines = logData.split('\n').slice(-20); // Get last 20 lines
            
            // Look for bitrate info (typically looks like "bitrate=1234kbits/s")
            const bitrateMatch = lines.join('\n').match(/bitrate=\s*([0-9.]+)kbits\/s/);
            if (bitrateMatch) {
              processInfo.bitrate = `${bitrateMatch[1]} kbits/s`;
            }
            
            // Look for fps info
            const fpsMatch = lines.join('\n').match(/fps=\s*([0-9.]+)/);
            if (fpsMatch) {
              processInfo.fps = `${fpsMatch[1]} fps`;
            }
          }
        } else {
          return { running: false };
        }
      } catch (error) {
        console.error(`Error getting Windows process info for stream ${id}:`, error);
        return { running: false };
      }
    } else {
      // Linux/Mac implementation
      try {
        const grepCmd = `ps aux | grep "${stream.link1}" | grep -v grep`;
        const psOutput = execSync(grepCmd).toString();
        const lines = psOutput.trim().split('\n');
        
        if (lines.length > 0) {
          // Format for ps aux:
          // USER  PID  %CPU  %MEM  VSZ  RSS  TTY  STAT  START  TIME  COMMAND
          const parts = lines[0].split(/\s+/);
          pid = parts[1];
          
          processInfo = {
            running: true,
            pid,
            cpu: `${parts[2]}%`,
            memory: `${Math.round(parseInt(parts[5]) / 1024)} MB`, // RSS in KB to MB
            runtime: parts[9], // TIME column
            bitrate: 'N/A',
            fps: 'N/A'
          };
          
          // Try to get FFmpeg stats from log file
          const logFile = path.join(STREAM_LOGS_DIR, `${id}.log`);
          if (fs.existsSync(logFile)) {
            const logData = fs.readFileSync(logFile, 'utf8');
            const lines = logData.split('\n').slice(-20); // Get last 20 lines
            
            // Look for bitrate info (typically looks like "bitrate=1234kbits/s")
            const bitrateMatch = lines.join('\n').match(/bitrate=\s*([0-9.]+)kbits\/s/);
            if (bitrateMatch) {
              processInfo.bitrate = `${bitrateMatch[1]} kbits/s`;
            }
            
            // Look for fps info
            const fpsMatch = lines.join('\n').match(/fps=\s*([0-9.]+)/);
            if (fpsMatch) {
              processInfo.fps = `${fpsMatch[1]} fps`;
            }
          }
        } else {
          return { running: false };
        }
      } catch (error) {
        console.error(`Error getting Unix process info for stream ${id}:`, error);
        return { running: false };
      }
    }
    
    return processInfo;
  } catch (error) {
    console.error(`Error getting process info for stream ${id}:`, error);
    return { running: false };
  }
} 