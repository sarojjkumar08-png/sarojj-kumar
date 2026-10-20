from datetime import datetime, timedelta, timezone
NOW=datetime.now(timezone.utc)
STUDENTS=[]; SKILLS=[]; QUIZZES=[]; LOGS=[]; REPORTS=[]
names=["Arjun","Priya","Kavin","Meena","Rahul","Divya","Santhosh","Nila","Vijay","Anu"]
subjects=["Python","Data Structures","DBMS","Machine Learning","Computer Networks"]
for i,name in enumerate(names):
 sid=f"student-{i+1:03d}"
 STUDENTS.append({"id":sid,"name":name,"email":f"{name.lower()}@demo.college.edu","role":"student","department":"AIML","year":3,"college_id":"college-demo"})
 for j,sub in enumerate(subjects):
  score=([35,58,74,43,80][j] if i==0 else [35,55,76,48,82][(i+j)%5])
  days=[42,18,4,31,2][(i+j)%5]
  last=(NOW-timedelta(days=days)).isoformat()
  SKILLS.append({"id":f"skill-{i+1:03d}-{j+1}","user_id":sid,"subject_name":sub,"freshness_score":score,"baseline_freshness_score":score,"last_practiced_at":last,"decay_baseline_at":last,
   "status":"fresh" if score>70 else ("decaying" if score>=40 else "dead"),"last_quiz_score":score,"weak_topic":"fundamentals and practical application",
   "decay_history":[{"date":(NOW-timedelta(days=d)).date().isoformat(),"score":max(0,min(100,score+(d-30)*.5))} for d in [180,150,120,90,60,30,15,0]]})
def log(agent,action,inp,out):
 item={"id":f"log-{len(LOGS)+1}","agent_name":agent,"action":action,"input":str(inp)[:500],"output":str(out)[:1200],"timestamp":datetime.now(timezone.utc).isoformat()}
 LOGS.insert(0,item); del LOGS[100:]; return item
def student(sid="student-001"): return next((x for x in STUDENTS if x["id"]==sid),STUDENTS[0])
def skills(sid): return [x for x in SKILLS if x["user_id"]==sid]
def readiness(sid):
 xs=skills(sid); return round(sum(x["freshness_score"] for x in xs)/len(xs)) if xs else 0
def refresh(s):
 s["freshness_score"]=round(max(0,min(100,float(s["freshness_score"]))),1)
 s["status"]="fresh" if s["freshness_score"]>70 else ("decaying" if s["freshness_score"]>=40 else "dead")
