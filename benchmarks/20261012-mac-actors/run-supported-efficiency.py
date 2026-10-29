from pathlib import Path
from datetime import datetime,timezone
import hashlib,importlib.util,json,os,subprocess,sys,traceback
root=Path('<private-dir>');scratch=Path('<private-dir>')
plan_path=scratch/'supported-efficiency-plan.json';plan=json.loads(plan_path.read_text())
head=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
assert head==next(l['source_sha'] for l in plan['lanes'] if l['id']=='hey600a_runtime')
assert not subprocess.check_output(['git','-C',str(root),'status','--porcelain'],text=True).strip()
for key in list(os.environ):
 if key.startswith(('HEY_','ERL_')) or key in plan['sanitized_parent_environment']:
  os.environ.pop(key,None)
spec=importlib.util.spec_from_file_location('efficiency',root/'tools/actor_bench/efficiency_scorecard.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
receipt=scratch/'supported-efficiency-controller.json';result_path=scratch/'supported-efficiency-results'
state=dict(pid=os.getpid(),source_sha=head,started=datetime.now(timezone.utc).isoformat(),state='RUNNING',
    plan_sha256=hashlib.sha256(plan_path.read_bytes()).hexdigest(),output=str(result_path),
    log=str(scratch/'supported-efficiency.log'))
receipt.write_text(json.dumps(state,indent=2)+'\n');print(json.dumps(state),flush=True)
try:
 summary=mod.run_plan(plan,result_path)
 statuses={status:sum(c['status']==status for c in summary['cells']) for status in {c['status'] for c in summary['cells']}}
 actual=[c for c in summary['cells'] if c['lane'] not in ('caf','akka','hey_cooperate_park') and c['case']!='1brc']
 assert len(summary['cells'])==63 and len(actual)==36
 passed=all(c['status']=='PASS' for c in actual)
 state.update(state='COMPLETE' if passed else 'FAILED',exit=0 if passed else 1,status_counts=statuses,
              finished=datetime.now(timezone.utc).isoformat(),scope='Supported actual36cells only;27explicitNOT_RUNcells do not qualify a complete release')
 receipt.write_text(json.dumps(state,indent=2)+'\n');print(json.dumps(state),flush=True)
 raise SystemExit(state['exit'])
except Exception:
 state.update(state='FAILED',exit=1,finished=datetime.now(timezone.utc).isoformat(),error=traceback.format_exc())
 receipt.write_text(json.dumps(state,indent=2)+'\n');raise
