"""Rebuild the reviewed study PDF and its private server-side download revision."""
from pathlib import Path
import sys,base64,hashlib
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFontFamily('DejaVu',normal='DejaVu',bold='DejaVu-Bold',italic='DejaVu',boldItalic='DejaVu-Bold')
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True)
navy=colors.HexColor('#163456');teal=colors.HexColor('#116b66')
styles={
 'title':ParagraphStyle('title',fontName='DejaVu-Bold',fontSize=21,leading=25,textColor=navy,spaceAfter=10),
 'h':ParagraphStyle('h',fontName='DejaVu-Bold',fontSize=14,leading=18,textColor=teal,spaceBefore=10,spaceAfter=6),
 'p':ParagraphStyle('p',fontName='DejaVu',fontSize=12,leading=16,spaceAfter=6),
 'small':ParagraphStyle('small',fontName='DejaVu',fontSize=9.5,leading=13,spaceAfter=5),
 'formula':ParagraphStyle('formula',fontName='DejaVu-Bold',fontSize=12,leading=17,textColor=navy,backColor=colors.HexColor('#edf5fa'),borderPadding=8,spaceBefore=4,spaceAfter=11),
}
story=[]
def p(t,s='p'):story.append(Paragraph(t,styles[s]))
def h(t):p(t,'h')
def formula(t):p(t,'formula')
def table(rows,widths):
 cells=[[Paragraph(t,styles['small' if i==0 else 'p']) for t in row] for i,row in enumerate(rows)]
 t=Table(cells,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e1eee9')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#b8c9d5')),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]));story.append(t)
def page(title,subtitle):p(title,'title');p(subtitle,'small')
page('Strength of solutions','PHARMACEUTICAL ANALYSIS | Corrected study edition | 7 October 2026')
p('<b>Concentration</b> describes how much solute is present relative to a stated amount of solution or solvent. Always state the unit and the basis.')
h('1. Molarity (M)')
p('Moles of solute per litre of the <b>final solution</b>.')
formula('M = moles of solute / volume of solution in litres')
p('<b>Example:</b> Dissolve 5.844 g NaCl and make the final solution volume 1.000 L. Using 58.44 g/mol, molarity = 0.1000 mol/L.')
h('2. Molality (m)')
p('Moles of solute per kilogram of <b>solvent</b>, not kilograms of solution.')
formula('m = moles of solute / mass of solvent in kilograms')
p('<b>Example:</b> 5.844 g NaCl dissolved in 0.5000 kg water gives 0.2000 mol/kg. Do not use the combined mass of salt and water as the denominator.')
h('3. Normality (N)')
p('Equivalents of solute per litre of solution for a <b>specified reaction</b>. The n-factor is the number of equivalents per mole in that reaction.')
formula('N = equivalents / litres of solution = M x n-factor')
p('For complete acid-base neutralisation: 0.10 M HCl = 0.10 N; 0.10 M H<sub>2</sub>SO<sub>4</sub> = 0.20 N when both acidic protons react.')
p('The n-factor is reaction-dependent. In redox reactions it depends on electrons transferred; it is not always the number of H or OH groups.')
h('Remember')
p('<b>Molarity:</b> litres of solution. <b>Molality:</b> kilograms of solvent. <b>Normality:</b> specify the reaction.')
story.append(PageBreak())
page('Percentages, ratio strength & ppm','State the basis: mass/mass, volume/volume or mass/volume.')
h('4. Percentage strength')
table([['Expression','Meaning and example'],['% w/w','Grams of solute per 100 g of final mixture.<br/>2% w/w = 2 g in 100 g total mixture.'],['% w/v','Grams of solute per 100 mL of final solution.<br/>5% w/v = 5 g made up to 100 mL.'],['% v/v','mL of liquid solute per 100 mL of final solution.<br/>70% v/v = 70 mL made up to 100 mL.'],['% v/w','mL of liquid solute per 100 g of final mixture.<br/>2% v/w = 2 mL in 100 g total mixture.']],[95,400])
p('Use the units stated above. Final solution volume is not the same as the volume of solvent added.','small')
h('5. Ratio strength')
p('1:n means one part of solute in n parts of the final preparation. State the basis, such as w/v.')
formula('1:1000 w/v = 1 g in 1000 mL = 0.1% w/v')
h('6. Parts per million (ppm)')
p('One part in one million parts, on a specified basis. For mass-based ppm, use matching mass units in the ratio.')
formula('ppm (mass basis) = (mass of solute / mass of solution) x 10<super>6</super>')
p('<b>Example:</b> 2 mg solute in 1 kg solution = 2 ppm by mass. In dilute aqueous solutions with density close to 1 kg/L, 1 mg/L is approximately 1 ppm.')
p('<b>Correction:</b> The multiplier is one million (10<super>6</super>), not 100%. Prefer explicit units such as mg/kg or mg/L when reporting results.')
h('Quick practice')
p('0.020 mol dissolved in 0.250 kg solvent: <b>0.080 mol/kg</b>.<br/>3 mg in 1.5 kg final solution: <b>2 ppm by mass</b>.')
story.append(PageBreak())
page('Primary & secondary standards','Standard solutions and standardisation')
h('7. Standard solution')
p('A solution whose concentration is known accurately. It provides a reference for quantitative analysis.')
h('8. Primary standard')
p('A substance of suitable high purity and stability that can be weighed accurately to prepare a solution of known concentration or to standardise another solution.')
p('Desirable properties: known composition, stability during handling, suitable solubility, and a rapid, complete reaction with known stoichiometry. Dry or condition it as the specified method requires.')
p('<b>Examples:</b> suitable anhydrous sodium carbonate for standardising acids; potassium hydrogen phthalate (KHP) for standardising bases.')
h('9. Secondary standard solution')
p('A solution whose concentration is established by comparison with a reliable standard. Direct preparation alone may not give the required concentration accuracy.')
p('<b>Examples:</b> HCl and NaOH solutions. NaOH absorbs moisture and carbon dioxide; its concentration must be checked and controlled.')
h('10. Standardisation')
p('Determine the concentration of a solution using a suitable reference. In titration, use the balanced reaction and the measured volume; repeat measurements as required by the method.')
formula('Known reference + measured titre + reaction ratio = concentration')
p('For complete neutralisation:<br/>Na<sub>2</sub>CO<sub>3</sub> + 2HCl &rarr; 2NaCl + H<sub>2</sub>O + CO<sub>2</sub><br/>One mole of sodium carbonate reacts with two moles of HCl.')
h('References and revision note')
p('Definitions checked against IUPAC Gold Book: <link href="https://goldbook.iupac.org/terms/view/A00295" color="#116b66">amount concentration</link>, <link href="https://goldbook.iupac.org/terms/view/M03970" color="#116b66">molality</link>, and <link href="https://goldbook.iupac.org/terms/view/11538" color="#116b66">standardization</link>. ppm convention: <link href="https://www.nist.gov/pml/special-publication-330/sp-330-section-5" color="#116b66">NIST SP 330, section 5</link>. Accessed 7 October 2026.','small')
p('This edition corrects the molality denominator, ppm multiplier, and the overly broad n-factor statement in the previous two-page file. AI-assisted study material; use alongside your course texts and the prescribed laboratory method. It is not an official pharmacopoeial procedure.','small')
def decor(c,d):
 w,h=A4;c.saveState();c.setFillColor(navy);c.setFont('DejaVu-Bold',10);c.drawString(50,h-30,'EZ EDUCATION');c.setStrokeColor(teal);c.line(50,h-38,w-50,h-38);c.setFont('DejaVu',9);c.setFillColor(colors.HexColor('#536675'));c.drawString(50,28,'Ez Education - Easy Notes for Everyone');c.drawRightString(w-50,28,f'{d.page} / 3');c.restoreState()
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=57,bottomMargin=48,title='Strength of Solutions and Standards - Corrected Edition',author='Ez Education').build(story,onFirstPage=decor,onLaterPages=decor)
data=out.read_bytes();b64=base64.b64encode(data).decode();sha=hashlib.sha256(data).hexdigest()
(root/'content/reviewed-notes/concentrations.ts').write_text('// Generated by scripts/create-reviewed-concentrations.py. Kept out of public assets so payment checks still apply.\nexport const revision = '+repr({'noteId':'95bb5d11-7223-444f-9d56-146190728446','fileKey':'notes/95bb5d11-7223-444f-9d56-146190728446.pdf','date':'2026-10-07','sha256':sha,'base64':b64}).replace("'",'"')+' as const;\n')
print(str(out));print('bytes',len(data),'sha256',sha)
