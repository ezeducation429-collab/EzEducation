import type {Metadata} from 'next';
import PythonInterpreter from './python-interpreter';
export const metadata:Metadata={title:'Online Python Interpreter | Ez Education',description:'Write and run Python programs online. Practice variables, conditions, loops and input with Ez Education.',alternates:{canonical:'/python-interpreter'}};
export default function Page(){return <PythonInterpreter/>}
