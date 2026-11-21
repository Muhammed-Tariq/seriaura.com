import {configureTheme} from './interface.mjs';
configureTheme();
fetch('data/coverage.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(report=>{
 const c=report.counts,n=x=>x.toLocaleString('en-GB');
 document.getElementById('stats').textContent=`${n(c.stations)} stations · ${n(c.lines)} progress groups · ${n(c.trackWays)} geographic track ways. Snapshot: ${report.snapshotDate}.`;
 document.getElementById('audit-status').textContent=`Mainline reference: ${report.checks.orr.matched}/${report.checks.orr.expected}. Northern Ireland: ${report.checks.northernIreland.matched}/${report.checks.northernIreland.expected}. ${n(c.unassignedStations)} stations still lack a service assignment.`;
 const list=document.getElementById('limitations');list.replaceChildren();for(const text of report.limitations){const li=document.createElement('li');li.textContent=text;list.append(li);}
}).catch(()=>{document.getElementById('audit-status').textContent='The audit could not be loaded. Use the direct download below.';});
