from pathlib import Path
from datetime import datetime,timezone
import hashlib,importlib.util,json,os,sys,traceback
r=Path('/private/tmp/hey-600a-local-resume-validation');p=r/'timer-scale-plan.json';plan=json.loads(p.read_text())
for k in list(os.environ):
 if k.startswith(('HEY_','ERL_')):os.environ.pop(k,None)
for lane in plan['lanes']:
 command=plan['cases'][0]['commands'][lane['id']][0]
 assert hashlib.sha256(Path(command).read_bytes()).hexdigest()==lane['binary_sha256']
s=importlib.util.spec_from_file_location('efficiency','/private/tmp/hey-600a-feature-batch/tools/actor_bench/efficiency_scorecard.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
receipt=r/'timer-scale-controller.json';state=dict(pid=os.getpid(),started=datetime.now(timezone.utc).isoformat(),state='RUNNING',plan_sha256=hashlib.sha256(p.read_bytes()).hexdigest());receipt.write_text(json.dumps(state,indent=2)+'\n');print(json.dumps(state),flush=True)
try:
 v=m.run_plan(plan,r/'timer-scale-results');okay=all(c['status']=='PASS' for c in v['cells']);state.update(state='COMPLETE' if okay else 'FAILED',exit=0 if okay else 1,finished=datetime.now(timezone.utc).isoformat());receipt.write_text(json.dumps(state,indent=2)+'\n');print(json.dumps(state),flush=True);sys.exit(state['exit'])
except Exception:
 state.update(state='FAILED',error=traceback.format_exc());receipt.write_text(json.dumps(state,indent=2)+'\n');raise
