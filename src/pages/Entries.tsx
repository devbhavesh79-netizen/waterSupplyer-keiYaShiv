import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { generateId, formatCurrency } from '../lib/utils';
import { Plus, Mic, MicOff, Trash2, Layers, Activity, HelpCircle, Keyboard, Filter, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const entrySchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  driverId: z.string().min(1, 'Driver is required'),
  type: z.string().min(1, 'Tanker type is required'),
  date: z.string(),
  count: z.number().min(1).max(50).default(1),
});

type EntryForm = z.infer<typeof entrySchema>;

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const Entries = () => {
  const { clients, drivers, entries, tankerSizes, addEntry, addBulkEntries, deleteEntry } = useStore();
  const [isListening, setIsListening] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [manualCommand, setManualCommand] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Filter States
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterType, setFilterType] = useState('');

  const recognitionRef = useRef<any>(null);

  const defaultType = tankerSizes.length > 0 ? tankerSizes[0].name : '';

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: defaultType,
      count: 1
    }
  });

  // Ensure default type is set if tankerSizes load late
  useEffect(() => {
    if (!watch('type') && tankerSizes.length > 0) {
      setValue('type', tankerSizes[0].name);
    }
  }, [tankerSizes, setValue, watch]);

  const selectedClientId = watch('clientId');
  const availableDrivers = drivers.filter(d => d.clientId === selectedClientId);
  
  const getPriceForEntry = (clientId: string, typeName: string) => {
    const client = clients.find(c => c.id === clientId);
    const size = tankerSizes.find(s => s.name === typeName);
    return client?.customPricing?.[typeName] || size?.price || 0;
  };

  const generateDistributedTimes = (baseDate: Date, count: number) => {
    const times = [];
    const startHour = 8;
    const endHour = 20;
    const totalHours = endHour - startHour;
    const intervalMs = (totalHours * 60 * 60 * 1000) / (count || 1);

    for (let i = 0; i < count; i++) {
      const entryTime = new Date(baseDate);
      entryTime.setHours(startHour, 0, 0, 0);
      const timeOffset = intervalMs * i;
      const jitter = (Math.random() * 30 - 15) * 60 * 1000; 
      times.push(new Date(entryTime.getTime() + timeOffset + jitter));
    }
    return times;
  };

  const onSubmit = (data: EntryForm) => {
    const entryPrice = getPriceForEntry(data.clientId, data.type);

    if (data.count > 1) {
      const newEntries = [];
      const baseDate = new Date(data.date);
      const times = generateDistributedTimes(baseDate, data.count);

      times.forEach(time => {
        newEntries.push({
          id: generateId(),
          clientId: data.clientId,
          driverId: data.driverId,
          type: data.type,
          price: entryPrice,
          date: time.toISOString()
        });
      });
      
      addBulkEntries(newEntries);
      setVoiceFeedback({ type: 'success', msg: `Added ${data.count} entries for ${format(baseDate, 'dd MMM')}` });
    } else {
      const now = new Date();
      const entryDate = new Date(data.date);
      if (entryDate.toDateString() === now.toDateString()) {
         entryDate.setHours(now.getHours(), now.getMinutes());
      } else {
         entryDate.setHours(12, 0);
      }

      addEntry({
        id: generateId(),
        ...data,
        date: entryDate.toISOString(),
        price: entryPrice
      });
      setVoiceFeedback({ type: 'success', msg: 'Entry added successfully' });
    }

    reset({
      date: new Date().toISOString().split('T')[0],
      type: defaultType,
      clientId: '',
      driverId: '',
      count: 1
    });
  };

  const processCommand = (transcript: string) => {
    const lower = transcript.toLowerCase();
    setVoiceTranscript(lower);

    // 1. Identify Client
    const matchedClient = clients.find(c => lower.includes(c.name.toLowerCase()));
    if (!matchedClient) {
      setVoiceFeedback({ type: 'error', msg: "Client not found. Please say the client name clearly." });
      return;
    }

    // 2. Identify Driver
    const clientDrivers = drivers.filter(d => d.clientId === matchedClient.id);
    let matchedDriver = clientDrivers.find(d => lower.includes(d.name.toLowerCase()));
    if (!matchedDriver && clientDrivers.length > 0) matchedDriver = clientDrivers[0];
    
    if (!matchedDriver) {
      setVoiceFeedback({ type: 'error', msg: `No drivers found for ${matchedClient.name}.` });
      return;
    }

    // 3. Identify Tanker Type (Dynamic)
    let type = defaultType;
    for (const size of tankerSizes) {
      if (lower.includes(size.name.toLowerCase()) || lower.includes(size.name.replace(/\D/g,''))) {
        type = size.name;
        break;
      }
    }

    // 4. Identify Month
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const currentMonthIdx = new Date().getMonth();
    let monthIdx = currentMonthIdx;
    
    const foundMonth = months.findIndex(m => lower.includes(m));
    if (foundMonth !== -1) monthIdx = foundMonth;

    const year = new Date().getFullYear();

    // 5. Complex Parsing
    const dailyPattern = /(\d{1,2})\s*(?:ko|date|tarikh|trip|trips|entry|entries)\s*(\d{1,2})/g;
    let match;
    const bulkData: { day: number, count: number }[] = [];

    while ((match = dailyPattern.exec(lower)) !== null) {
      const day = parseInt(match[1]);
      const count = parseInt(match[2]);
      if (day > 0 && day <= 31 && count > 0) {
        bulkData.push({ day, count });
      }
    }

    if (bulkData.length > 0) {
      const allNewEntries: any[] = [];
      let totalTrips = 0;
      const entryPrice = getPriceForEntry(matchedClient.id, type);

      bulkData.forEach(({ day, count }) => {
        const date = new Date(year, monthIdx, day);
        const times = generateDistributedTimes(date, count);
        
        times.forEach(time => {
          allNewEntries.push({
            id: generateId(),
            clientId: matchedClient.id,
            driverId: matchedDriver!.id,
            type,
            price: entryPrice,
            date: time.toISOString()
          });
        });
        totalTrips += count;
      });

      addBulkEntries(allNewEntries);
      setVoiceFeedback({ 
        type: 'success', 
        msg: `Processed: ${matchedClient.name}, Total ${totalTrips} trips across ${bulkData.length} days.` 
      });
    } else {
      setValue('clientId', matchedClient.id);
      setValue('driverId', matchedDriver.id);
      setValue('type', type);
      setVoiceFeedback({ type: 'info', msg: `Form filled for ${matchedClient.name}. Say "1 date ko 5" to add trips.` });
    }
  };

  const toggleVoiceInput = () => {
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceFeedback({ type: 'error', msg: "Voice input not supported in this browser. Use manual input." });
      setShowManualInput(true);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedback({ type: 'info', msg: 'Listening... Speak now!' });
        setVoiceTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          setVoiceFeedback({ type: 'error', msg: 'Mic blocked. Please type command below.' });
          setShowManualInput(true);
        } else {
          setVoiceFeedback({ type: 'error', msg: `Error: ${event.error}` });
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        processCommand(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setVoiceFeedback({ type: 'error', msg: 'Failed to start microphone.' });
    }
  };

  const handleManualCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCommand.trim()) return;
    processCommand(manualCommand);
    setManualCommand('');
  };

  const clearFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setFilterClient('');
    setFilterDriver('');
    setFilterType('');
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      let isValid = true;
      const entryDate = parseISO(entry.date);

      if (filterFrom) {
        isValid = isValid && entryDate >= startOfDay(parseISO(filterFrom));
      }
      if (filterTo) {
        isValid = isValid && entryDate <= endOfDay(parseISO(filterTo));
      }
      if (filterClient) {
        isValid = isValid && entry.clientId === filterClient;
      }
      if (filterDriver) {
        isValid = isValid && entry.driverId === filterDriver;
      }
      if (filterType) {
        isValid = isValid && entry.type === filterType;
      }

      return isValid;
    });
  }, [entries, filterFrom, filterTo, filterClient, filterDriver, filterType]);

  const filterAvailableDrivers = drivers.filter(d => filterClient ? d.clientId === filterClient : true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Entry Form */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">
                {isBulkMode ? 'Bulk Entry' : 'New Entry'}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowManualInput(!showManualInput)}
                  className={`p-2 rounded-lg transition-colors ${showManualInput ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  title="Type Command"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  title="Voice Commands Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsBulkMode(!isBulkMode)}
                  className={`p-2 rounded-lg transition-colors ${isBulkMode ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  title="Toggle Bulk Mode"
                >
                  <Layers className="w-5 h-5" />
                </button>
                <button 
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-full transition-colors relative ${isListening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Start Voice Input"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  {isListening && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
                </button>
              </div>
            </div>

            {showHelp && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p className="font-bold mb-1">Try saying (or typing):</p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li>"Hemu 1 date ko 5, 2 ko 6 trips"</li>
                  <li>"Ravi 10 entries" (Uses today's date)</li>
                  <li>`Hemu ${tankerSizes[0]?.name || '5000'}`</li>
                </ul>
              </div>
            )}

            {showManualInput && (
              <form onSubmit={handleManualCommandSubmit} className="mb-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualCommand}
                    onChange={(e) => setManualCommand(e.target.value)}
                    placeholder="Type command (e.g., Hemu 1 date ko 5)"
                    className="flex-1 p-2 border rounded-lg text-sm"
                  />
                  <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Go</button>
                </div>
              </form>
            )}

            {(voiceFeedback || isListening) && (
              <div className={`mb-4 p-3 rounded-lg text-sm border ${
                voiceFeedback?.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 
                voiceFeedback?.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {isListening ? 'Listening...' : voiceFeedback?.msg}
                    </p>
                    {voiceTranscript && <p className="text-xs opacity-75 mt-1">"{voiceTranscript}"</p>}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" {...register('date')} className="w-full p-2 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select {...register('clientId')} className="w-full p-2 border rounded-lg">
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select {...register('driverId')} className="w-full p-2 border rounded-lg" disabled={!selectedClientId}>
                  <option value="">Select Driver</option>
                  {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.driverId && <p className="text-red-500 text-xs mt-1">{errors.driverId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanker Type</label>
                <div className={`grid gap-3 ${tankerSizes.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {tankerSizes.map(size => {
                    const priceToDisplay = getPriceForEntry(selectedClientId, size.name);
                    return (
                      <label key={size.id} className={`border rounded-lg p-3 text-center cursor-pointer transition-colors ${watch('type') === size.name ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}>
                        <input type="radio" value={size.name} {...register('type')} className="hidden" />
                        <span className="block font-semibold text-sm">{size.name}</span>
                        <span className="text-xs text-gray-500">{formatCurrency(priceToDisplay)}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
              </div>

              {isBulkMode && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <label className="block text-sm font-medium text-blue-800 mb-1">Number of Trips</label>
                  <input 
                    type="number" 
                    {...register('count', { valueAsNumber: true })} 
                    className="w-full p-2 border rounded-lg" 
                    min="1" 
                    max="50"
                  />
                  <p className="text-xs text-blue-600 mt-2">
                    System will automatically distribute {watch('count')} trips between 8:00 AM and 8:00 PM.
                  </p>
                </div>
              )}

              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center gap-2">
                <Plus className="w-5 h-5" /> {isBulkMode ? 'Generate Bulk Entries' : 'Add Entry'}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Entries List with Filters */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" /> Filter Entries
                </h2>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">{filteredEntries.length} Results</span>
                  {(filterFrom || filterTo || filterClient || filterDriver || filterType) && (
                    <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear All
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                  <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                  <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                  <select value={filterClient} onChange={(e) => { setFilterClient(e.target.value); setFilterDriver(''); }} className="w-full p-1.5 text-sm border rounded">
                    <option value="">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
                  <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="w-full p-1.5 text-sm border rounded" disabled={!filterClient && filterAvailableDrivers.length === drivers.length}>
                    <option value="">All Drivers</option>
                    {filterAvailableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full p-1.5 text-sm border rounded">
                    <option value="">All Types</option>
                    {tankerSizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white text-gray-500 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date & Time</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Driver</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEntries.slice(0, 100).map(entry => { 
                    const client = clients.find(c => c.id === entry.clientId);
                    const driver = drivers.find(d => d.id === entry.driverId);
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-600">
                          {format(new Date(entry.date), 'dd MMM')} <span className="text-xs text-gray-400">{format(new Date(entry.date), 'hh:mm a')}</span>
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">{client?.name || 'Unknown'}</td>
                        <td className="px-6 py-3 text-gray-600">{driver?.name || 'Unknown'}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">{formatCurrency(entry.price)}</td>
                        <td className="px-6 py-3">
                          <button onClick={() => deleteEntry(entry.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No entries found matching your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredEntries.length > 100 && (
                <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t">
                  Showing top 100 results. Use filters to narrow down.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
