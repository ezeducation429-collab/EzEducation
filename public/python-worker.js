/* A fresh namespace per run; package downloads do not count toward run time. */
const base = new URL('/python-runtime/', self.location.href).href;
let runtime;
let active = false;
async function initialize() {
  self.postMessage({type:'status', text:'Starting Python…'});
  importScripts(base + 'pyodide.js');
  runtime = await loadPyodide({indexURL:base});
  self.postMessage({type:'ready', version:runtime.runPython('import sys; sys.version.split()[0]')});
}
const ready = initialize().catch(error => {
  self.postMessage({type:'load-error',text:'Python could not load. Please retry. '+String(error)});
  return null;
});
self.onmessage = async ({data}) => {
  if(data.type!=='run'||active)return;
  active=true;
  try {
    await ready;
    if(!runtime)throw Error('Python is unavailable. Please restart.');
    self.postMessage({type:'packages',text:'Checking libraries used by your program…'});
    await runtime.loadPackagesFromImports(data.code,{messageCallback:text=>self.postMessage({type:'status',text}),errorCallback:()=>{}});
    // Use a noninteractive backend and return figure images to the page.
    if(runtime.loadedPackages.matplotlib)runtime.runPython('import matplotlib; matplotlib.use("Agg", force=True)');
    runtime.globals.set('_ez_code',data.code);
    runtime.globals.set('_ez_answers_json',JSON.stringify(data.answers||[]));
    self.postMessage({type:'started'});
    const result=await runtime.runPythonAsync(`
import sys as _sys, io as _io, contextlib as _contextlib, traceback as _traceback, json as _json, base64 as _base64, builtins as _builtins
class _NeedInput(BaseException):
    pass
class _LimitedOutput(_io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 100000:
            raise RuntimeError("Output limit reached. Print fewer values.")
        return super().write(text)
def _ez_run():
    output = _LimitedOutput()
    answers = iter(_json.loads(_ez_answers_json))
    old_input = _sys.stdin
    plots = []
    prompt = ""
    state = "success"
    def read_input(message=""):
        nonlocal prompt
        try:
            answer = next(answers)
            output.write(str(message) + str(answer) + "\\n")
            return answer
        except StopIteration:
            prompt = str(message) or "Enter a value:"
            raise _NeedInput()
    def collect_plots():
        if "matplotlib.pyplot" in _sys.modules:
            plt = _sys.modules["matplotlib.pyplot"]
            for number in plt.get_fignums()[:8]:
                buf = _io.BytesIO()
                plt.figure(number).savefig(buf, format="png", bbox_inches="tight", dpi=100)
                if buf.tell() > 5000000:
                    raise RuntimeError("Plot is too large. Reduce the figure size.")
                plots.append(_base64.b64encode(buf.getvalue()).decode("ascii"))
            plt.close("all")
    try:
        if "matplotlib.pyplot" in _sys.modules:
            _sys.modules["matplotlib.pyplot"].close("all")
        import os
        os.chdir("/home/pyodide")
        with open("pk_data.csv", "w") as f:
            f.write("time_h,concentration_mg_L\\n0,0\\n1,8\\n2,6\\n4,3\\n8,1\\n")
        with open("adr_reports.csv", "w") as f:
            f.write("drug,reports\\nA,4\\nB,7\\nA,3\\nC,2\\n")
        _sys.stdin = _io.StringIO("\\n".join(_json.loads(_ez_answers_json)))
        safe_builtins = dict(vars(_builtins))
        safe_builtins["input"] = read_input
        env = {"__name__":"__main__", "__builtins__":safe_builtins}
        with _contextlib.redirect_stdout(output), _contextlib.redirect_stderr(output):
            try:
                exec(compile(_ez_code,"main.py","exec"),env)
                collect_plots()
            except _NeedInput:
                state = "input"
            except BaseException:
                state = "error"
                error = _traceback.format_exc()
                text = (output.getvalue() + error)[-100000:]
                return _json.dumps({"state":state,"text":text,"plots":plots})
    finally:
        _sys.stdin = old_input
    return _json.dumps({"state":state,"text":output.getvalue(),"prompt":prompt,"plots":plots})
_ez_run()
`);
    self.postMessage({type:'result',...JSON.parse(result)});
  }catch(error){self.postMessage({type:'result',state:'error',text:String(error),plots:[]});}
  finally{active=false;}
};
