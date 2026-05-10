import { Injectable } from '@nestjs/common';

// ─── 天干化运 ───
const TIAN_GAN_HUA_YUN: Record<string, { yun: string; wuxing: string; taiguoOrBurji: string }> = {
  '甲': { yun: '土运', wuxing: '土', taiguoOrBurji: '太过' },
  '己': { yun: '土运', wuxing: '土', taiguoOrBurji: '不及' },
  '乙': { yun: '金运', wuxing: '金', taiguoOrBurji: '不及' },
  '庚': { yun: '金运', wuxing: '金', taiguoOrBurji: '太过' },
  '丙': { yun: '水运', wuxing: '水', taiguoOrBurji: '太过' },
  '辛': { yun: '水运', wuxing: '水', taiguoOrBurji: '不及' },
  '丁': { yun: '木运', wuxing: '木', taiguoOrBurji: '不及' },
  '壬': { yun: '木运', wuxing: '木', taiguoOrBurji: '太过' },
  '戊': { yun: '火运', wuxing: '火', taiguoOrBurji: '太过' },
  '癸': { yun: '火运', wuxing: '火', taiguoOrBurji: '不及' },
};

// ─── 地支化气（司天/在泉）───
const DI_ZHI_HUA_QI: Record<string, { sitian: string; zaiquan: string; sitianWuxing: string; zaiquanWuxing: string }> = {
  '子': { sitian: '少阴君火', zaiquan: '阳明燥金', sitianWuxing: '火', zaiquanWuxing: '金' },
  '丑': { sitian: '太阴湿土', zaiquan: '太阳寒水', sitianWuxing: '土', zaiquanWuxing: '水' },
  '寅': { sitian: '少阳相火', zaiquan: '厥阴风木', sitianWuxing: '火', zaiquanWuxing: '木' },
  '卯': { sitian: '阳明燥金', zaiquan: '少阴君火', sitianWuxing: '金', zaiquanWuxing: '火' },
  '辰': { sitian: '太阳寒水', zaiquan: '太阴湿土', sitianWuxing: '水', zaiquanWuxing: '土' },
  '巳': { sitian: '厥阴风木', zaiquan: '少阳相火', sitianWuxing: '木', zaiquanWuxing: '火' },
  '午': { sitian: '少阴君火', zaiquan: '阳明燥金', sitianWuxing: '火', zaiquanWuxing: '金' },
  '未': { sitian: '太阴湿土', zaiquan: '太阳寒水', sitianWuxing: '土', zaiquanWuxing: '水' },
  '申': { sitian: '少阳相火', zaiquan: '厥阴风木', sitianWuxing: '火', zaiquanWuxing: '木' },
  '酉': { sitian: '阳明燥金', zaiquan: '少阴君火', sitianWuxing: '金', zaiquanWuxing: '火' },
  '戌': { sitian: '太阳寒水', zaiquan: '太阴湿土', sitianWuxing: '水', zaiquanWuxing: '土' },
  '亥': { sitian: '厥阴风木', zaiquan: '少阳相火', sitianWuxing: '木', zaiquanWuxing: '火' },
};

// ─── 五音建运（主运5步）───
const WU_YIN_JIAN_YUN = ['太角', '少徵', '太宫', '少商', '太羽']; // 木→火→土→金→水 始于木

// ─── 主气6步（从大寒起）───
const ZHU_QI_6: { name: string; wuxing: string; startTerm: string; desc: string }[] = [
  { name: '厥阴风木', wuxing: '木', startTerm: '大寒', desc: '初之气，风气渐盛，注意肝胆养护' },
  { name: '少阴君火', wuxing: '火', startTerm: '春分', desc: '二之气，火气上升，注意心脏调养' },
  { name: '少阳相火', wuxing: '火', startTerm: '小满', desc: '三之气，暑热当令，注意防暑降温' },
  { name: '太阴湿土', wuxing: '土', startTerm: '大暑', desc: '四之气，湿气弥漫，注意脾胃调理' },
  { name: '阳明燥金', wuxing: '金', startTerm: '秋分', desc: '五之气，燥气当令，注意肺脏滋润' },
  { name: '太阳寒水', wuxing: '水', startTerm: '小雪', desc: '终之气，寒气凛冽，注意肾脏保暖' },
];

// ─── 客气6步推算（基于司天）───
const KE_QI_SEQUENCE = ['厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水'];

function getKeQiSteps(sitian: string): { name: string; wuxing: string }[] {
  const idx = KE_QI_SEQUENCE.indexOf(sitian);
  if (idx === -1) return ZHU_QI_6.map(q => ({ name: q.name, wuxing: q.wuxing }));
  // Step 3 = 司天, Step 1 = 左间(司天前2), Step 6 = 在泉(司天对面)
  const steps: string[] = [];
  for (let i = 0; i < 6; i++) {
    steps.push(KE_QI_SEQUENCE[(idx - 2 + i + 6) % 6]);
  }
  return steps.map(name => ({
    name,
    wuxing: ZHU_QI_6.find(q => q.name === name)?.wuxing || '未知',
  }));
}

// ─── 24节气日期（近似，月日）───
const SOLAR_TERMS: { name: string; month: number; day: number }[] = [
  { name: '小寒', month: 1, day: 6 }, { name: '大寒', month: 1, day: 21 },
  { name: '立春', month: 2, day: 4 }, { name: '雨水', month: 2, day: 19 },
  { name: '惊蛰', month: 3, day: 6 }, { name: '春分', month: 3, day: 21 },
  { name: '清明', month: 4, day: 5 }, { name: '谷雨', month: 4, day: 20 },
  { name: '立夏', month: 5, day: 6 }, { name: '小满', month: 5, day: 21 },
  { name: '芒种', month: 6, day: 6 }, { name: '夏至', month: 6, day: 22 },
  { name: '小暑', month: 7, day: 7 }, { name: '大暑', month: 7, day: 23 },
  { name: '立秋', month: 8, day: 8 }, { name: '处暑', month: 8, day: 23 },
  { name: '白露', month: 9, day: 8 }, { name: '秋分', month: 9, day: 23 },
  { name: '寒露', month: 10, day: 8 }, { name: '霜降', month: 10, day: 24 },
  { name: '立冬', month: 11, day: 8 }, { name: '小雪', month: 11, day: 22 },
  { name: '大雪', month: 12, day: 7 }, { name: '冬至', month: 12, day: 22 },
];

function getCurrentZhuQiStep(month: number, day: number): number {
  for (let i = 5; i >= 0; i--) {
    const term = SOLAR_TERMS.find(t => t.name === ZHU_QI_6[i].startTerm);
    if (!term) continue;
    if (month > term.month || (month === term.month && day >= term.day)) return i;
  }
  return 5; // fallback to last step
}

// ─── 天干地支计算 ───
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function getYearGanZhi(year: number): { gan: string; zhi: string } {
  const baseYear = 1984; // 甲子年
  const offset = ((year - baseYear) % 60 + 60) % 60;
  return { gan: GAN[offset % 10], zhi: ZHI[offset % 12] };
}

// ─── 9种中医体质 ───
const CONSTITUTION_TYPES: Record<string, {
  name: string; traits: string; weaknesses: string;
  diet: string; exercise: string; acupoints: string[];
  yinYang: string; drynessDampness: string;
}> = {
  '平和质': {
    name: '平和质', traits: '阴阳调和，气血充盈，脏腑功能协调', weaknesses: '无明显偏颇',
    diet: '五谷为养，均衡饮食', exercise: '适度运动，保持活力', acupoints: ['足三里', '关元'],
    yinYang: '阴阳平衡', drynessDampness: '燥湿适中',
  },
  '气虚质': {
    name: '气虚质', traits: '元气不足，疲乏气短，自汗畏风', weaknesses: '易感冒，内脏下垂风险',
    diet: '健脾益气：山药、大枣、黄芪炖鸡、小米粥', exercise: '柔和运动：太极拳、八段锦', acupoints: ['气海', '足三里', '百会'],
    yinYang: '偏阳虚', drynessDampness: '偏湿',
  },
  '阳虚质': {
    name: '阳虚质', traits: '阳气不足，畏寒怕冷，手足不温', weaknesses: '脾胃虚寒，肾阳虚',
    diet: '温阳补气：羊肉、韭菜、生姜、肉桂', exercise: '晒太阳散步，避免晨练受寒', acupoints: ['关元', '命门', '神阙'],
    yinYang: '阳虚', drynessDampness: '偏寒湿',
  },
  '阴虚质': {
    name: '阴虚质', traits: '阴液亏少，口干咽燥，手足心热', weaknesses: '肺燥咳嗽，失眠盗汗',
    diet: '滋阴润燥：银耳、百合、梨、鸭肉', exercise: '避免大汗运动，选择游泳瑜伽', acupoints: ['太溪', '三阴交', '涌泉'],
    yinYang: '阴虚', drynessDampness: '偏燥',
  },
  '痰湿质': {
    name: '痰湿质', traits: '体形肥胖，痰多胸闷，口中粘腻', weaknesses: '高血脂，糖尿病风险',
    diet: '健脾化痰：薏仁、冬瓜、陈皮、赤小豆', exercise: '有氧运动出汗：跑步、骑行', acupoints: ['丰隆', '阴陵泉', '中脘'],
    yinYang: '偏阳虚', drynessDampness: '湿重',
  },
  '湿热质': {
    name: '湿热质', traits: '面垢油光，口苦口干，大便粘滞', weaknesses: '皮肤问题，肝胆疾病',
    diet: '清热利湿：绿豆、苦瓜、薏仁、莲子', exercise: '强度运动排汗：球类、游泳', acupoints: ['曲池', '阴陵泉', '太冲'],
    yinYang: '偏阴虚', drynessDampness: '湿热',
  },
  '血瘀质': {
    name: '血瘀质', traits: '肤色晦暗，舌质紫暗，易有瘀斑', weaknesses: '心脑血管风险',
    diet: '活血化瘀：山楂、黑豆、红糖、红酒少量', exercise: '促进循环：快走、跳舞', acupoints: ['血海', '三阴交', '合谷'],
    yinYang: '偏阴虚', drynessDampness: '偏燥',
  },
  '气郁质': {
    name: '气郁质', traits: '神情抑郁，忧虑脆弱，胸胁胀满', weaknesses: '抑郁症，乳腺增生',
    diet: '理气解郁：玫瑰花茶、柑橘、佛手', exercise: '团体运动释放：跳舞、户外', acupoints: ['太冲', '膻中', '期门'],
    yinYang: '气机郁滞', drynessDampness: '偏燥',
  },
  '特禀质': {
    name: '特禀质', traits: '先天失常，过敏体质，易发哮喘', weaknesses: '过敏性疾病',
    diet: '益气固表：黄芪、防风、白术', exercise: '温和运动增强免疫', acupoints: ['足三里', '迎香', '肺俞'],
    yinYang: '先天不足', drynessDampness: '因人而异',
  },
};

// ─── 五行-脏腑-经络-穴位映射 ───
interface OrganDetail {
  organ: string; fuOrgan: string; meridian: string; wuxing: string;
  function: string; excessSymptoms: string; deficiencySymptoms: string;
  keyAcupoints: { name: string; location: string; effect: string }[];
  dietExcess: string; dietDeficiency: string;
}

const WUXING_ORGAN_MAP: Record<string, OrganDetail> = {
  '木': {
    organ: '肝', fuOrgan: '胆', meridian: '足厥阴肝经 / 足少阳胆经', wuxing: '木',
    function: '主疏泄、藏血、主筋、开窍于目',
    excessSymptoms: '头痛眩晕、易怒、胸胁胀痛、目赤肿痛',
    deficiencySymptoms: '两目干涩、筋脉拘挛、爪甲不荣、失眠多梦',
    keyAcupoints: [
      { name: '太冲', location: '足背第1-2跖骨间凹陷处', effect: '平肝潜阳，疏肝解郁' },
      { name: '行间', location: '足背第1-2趾间', effect: '清肝泻火' },
      { name: '肝俞', location: '背部第9胸椎棘突下旁开1.5寸', effect: '疏肝利胆' },
    ],
    dietExcess: '宜食酸凉：山楂、醋、菊花茶；忌辛辣', dietDeficiency: '宜食甘温：大枣、枸杞、猪肝',
  },
  '火': {
    organ: '心', fuOrgan: '小肠', meridian: '手少阴心经 / 手太阳小肠经', wuxing: '火',
    function: '主血脉、藏神、主汗、开窍于舌',
    excessSymptoms: '心烦失眠、口舌生疮、小便短赤、脉数',
    deficiencySymptoms: '心悸怔忡、健忘、面色无华、脉弱',
    keyAcupoints: [
      { name: '神门', location: '腕横纹尺侧端凹陷处', effect: '宁心安神' },
      { name: '内关', location: '腕横纹上2寸两筋间', effect: '宽胸理气，宁心止痛' },
      { name: '心俞', location: '背部第5胸椎棘突下旁开1.5寸', effect: '养心安神' },
    ],
    dietExcess: '宜食苦寒：苦瓜、莲子心、绿茶', dietDeficiency: '宜食红色：红枣、桂圆、红豆',
  },
  '土': {
    organ: '脾', fuOrgan: '胃', meridian: '足太阴脾经 / 足阳明胃经', wuxing: '土',
    function: '主运化、统血、主肌肉四肢、开窍于口',
    excessSymptoms: '脘腹胀满、食欲不振、身体困重、大便溏泄',
    deficiencySymptoms: '面色萎黄、消瘦乏力、内脏下垂、肌肉萎缩',
    keyAcupoints: [
      { name: '足三里', location: '外膝眼下3寸胫骨前嵴外一横指', effect: '健脾和胃，扶正培元' },
      { name: '中脘', location: '腹部前正中线脐上4寸', effect: '健脾化湿，和胃降逆' },
      { name: '脾俞', location: '背部第11胸椎棘突下旁开1.5寸', effect: '健脾益气' },
    ],
    dietExcess: '宜食甘淡：薏仁、茯苓、扁豆', dietDeficiency: '宜食甘温：山药、小米、大枣',
  },
  '金': {
    organ: '肺', fuOrgan: '大肠', meridian: '手太阴肺经 / 手阳明大肠经', wuxing: '金',
    function: '主气、司呼吸、主皮毛、开窍于鼻',
    excessSymptoms: '咳嗽痰多、胸闷气喘、鼻塞流涕、皮肤湿疹',
    deficiencySymptoms: '少气懒言、易感冒、自汗盗汗、皮肤干燥',
    keyAcupoints: [
      { name: '太渊', location: '腕横纹桡侧端凹陷处', effect: '补肺益气，止咳平喘' },
      { name: '列缺', location: '桡骨茎突上方腕横纹上1.5寸', effect: '宣肺解表' },
      { name: '肺俞', location: '背部第3胸椎棘突下旁开1.5寸', effect: '补肺固表' },
    ],
    dietExcess: '宜食辛凉：白萝卜、薄荷、梨', dietDeficiency: '宜食白色：银耳、百合、山药',
  },
  '水': {
    organ: '肾', fuOrgan: '膀胱', meridian: '足少阴肾经 / 足太阳膀胱经', wuxing: '水',
    function: '主藏精、主水液、主骨生髓、开窍于耳',
    excessSymptoms: '水肿、小便不利、腰膝酸软、头晕耳鸣',
    deficiencySymptoms: '腰膝酸软、脱发齿松、听力下降、夜尿频多',
    keyAcupoints: [
      { name: '太溪', location: '内踝后方与跟腱之间凹陷处', effect: '滋阴补肾' },
      { name: '涌泉', location: '足底前1/3凹陷处', effect: '滋肾清热，引火归元' },
      { name: '肾俞', location: '背部第2腰椎棘突下旁开1.5寸', effect: '补肾强腰' },
    ],
    dietExcess: '宜食咸寒：海带、紫菜、冬瓜', dietDeficiency: '宜食黑色：黑豆、黑芝麻、桑葚',
  },
};

// ─── 症状-脏腑关联映射 ───
interface SymptomMapping {
  keywords: string[];
  relatedOrgans: string[];
  likelyPattern: string;
  acupoints: string[];
  advice: string;
}

const SYMPTOM_MAP: SymptomMapping[] = [
  { keywords: ['头痛', '头晕', '眩晕', '偏头痛'], relatedOrgans: ['肝', '心'], likelyPattern: '肝阳上亢或气血不足', acupoints: ['太冲', '太阳', '百会', '风池'], advice: '平肝潜阳，避免熬夜和情绪激动' },
  { keywords: ['失眠', '多梦', '难以入睡', '早醒', '睡眠'], relatedOrgans: ['心', '肝', '肾'], likelyPattern: '心肾不交或肝火扰心', acupoints: ['神门', '内关', '涌泉', '三阴交'], advice: '睡前泡脚，避免咖啡浓茶，按摩涌泉穴' },
  { keywords: ['咳嗽', '气喘', '喉咙', '痰', '感冒'], relatedOrgans: ['肺', '脾'], likelyPattern: '肺气不宣或脾虚生痰', acupoints: ['太渊', '列缺', '肺俞', '丰隆'], advice: '注意保暖，避免冷饮，多喝温水' },
  { keywords: ['胃痛', '胃胀', '消化', '腹泻', '便秘', '大便'], relatedOrgans: ['脾', '胃', '肝'], likelyPattern: '脾胃虚弱或肝胃不和', acupoints: ['足三里', '中脘', '天枢', '内关'], advice: '饮食规律，少食多餐，避免生冷刺激' },
  { keywords: ['腰痛', '腰酸', '背痛', '腰膝'], relatedOrgans: ['肾', '膀胱'], likelyPattern: '肾虚腰失所养', acupoints: ['肾俞', '命门', '委中', '太溪'], advice: '避免久坐久站，适当锻炼腰背肌群' },
  { keywords: ['心慌', '心悸', '胸闷', '胸痛'], relatedOrgans: ['心', '肺'], likelyPattern: '心气不足或胸阳不振', acupoints: ['内关', '膻中', '心俞', '神门'], advice: '保持情绪平和，避免剧烈运动，及时就医检查' },
  { keywords: ['疲劳', '乏力', '困倦', '没精神'], relatedOrgans: ['脾', '肾', '肝'], likelyPattern: '脾肾气虚或气血两虚', acupoints: ['足三里', '气海', '关元', '百会'], advice: '规律作息，保证充足睡眠，适当进补' },
  { keywords: ['关节', '疼痛', '风湿', '酸胀'], relatedOrgans: ['肝', '肾', '脾'], likelyPattern: '肝肾不足筋骨失养或风湿侵袭', acupoints: ['阳陵泉', '膝眼', '肾俞', '阿是穴'], advice: '注意保暖防潮，适当活动关节' },
  { keywords: ['皮肤', '过敏', '痒', '皮疹'], relatedOrgans: ['肺', '肝', '脾'], likelyPattern: '肺卫不固或血热生风', acupoints: ['曲池', '血海', '肺俞', '合谷'], advice: '避免过敏源，清淡饮食，保持皮肤清洁' },
  { keywords: ['月经', '痛经', '经期', '妇科'], relatedOrgans: ['肝', '肾', '脾'], likelyPattern: '肝郁气滞或宫寒血瘀', acupoints: ['三阴交', '关元', '血海', '太冲'], advice: '经期保暖，避免寒凉，保持心情舒畅' },
  { keywords: ['眼睛', '视力', '目', '眼干'], relatedOrgans: ['肝', '肾'], likelyPattern: '肝血不足或肾精亏虚', acupoints: ['睛明', '攒竹', '太冲', '光明'], advice: '减少用眼疲劳，多远眺绿色植物' },
  { keywords: ['耳鸣', '耳聋', '听力'], relatedOrgans: ['肾', '肝', '胆'], likelyPattern: '肾精不足或肝胆火旺', acupoints: ['听宫', '翳风', '太溪', '侠溪'], advice: '避免噪声环境，按摩耳周穴位' },
];

// ─── 奇经八脉 ───
const QI_JING_BA_MAI = [
  { name: '督脉', function: '总督一身之阳经，为阳脉之海', keyPoint: '命门', indication: '脊柱强痛、角弓反张' },
  { name: '任脉', function: '总任一身之阴经，为阴脉之海', keyPoint: '关元', indication: '月经不调、不孕不育' },
  { name: '冲脉', function: '调节十二经气血，为血海', keyPoint: '气冲', indication: '月经不调、气逆上冲' },
  { name: '带脉', function: '约束纵行诸经，主司妇女带下', keyPoint: '带脉', indication: '带下病、腰腹无力' },
  { name: '阴跷脉', function: '主一身左右之阴气，司眼睑开合', keyPoint: '照海', indication: '失眠、嗜睡' },
  { name: '阳跷脉', function: '主一身左右之阳气，司肢体运动', keyPoint: '申脉', indication: '癫痫、失眠' },
  { name: '阴维脉', function: '维系诸阴经，主里证', keyPoint: '内关', indication: '心痛、胃痛' },
  { name: '阳维脉', function: '维系诸阳经，主表证', keyPoint: '外关', indication: '恶寒发热、头痛' },
];

// ─── 五运六气对各脏腑的影响权重 ───
function getOrganImpactWeights(yearYun: string, sitian: string): Record<string, number> {
  const yunWx = TIAN_GAN_HUA_YUN[Object.keys(TIAN_GAN_HUA_YUN).find(k => {
    const v = TIAN_GAN_HUA_YUN[k];
    return `${v.yun}${v.taiguoOrBurji === '太过' ? '太过' : '不及'}` === yearYun ||
           `${v.yun}${v.taiguoOrBurji === '太过' ? '太过' : '不及'}`.includes(yearYun);
  }) || '甲']?.wuxing || '土';
  const qiWx = DI_ZHI_HUA_QI[Object.keys(DI_ZHI_HUA_QI).find(k => DI_ZHI_HUA_QI[k].sitian === sitian) || '子']?.sitianWuxing || '火';

  const weights: Record<string, number> = { '肝': 0, '心': 0, '脾': 0, '肺': 0, '肾': 0 };
  // Year yun affects its own element organ + the element it controls
  weights[WUXING_ORGAN_MAP[yunWx]?.organ || '脾'] += 3;
  // Sitian affects its element organ
  weights[WUXING_ORGAN_MAP[qiWx]?.organ || '心'] += 2;
  return weights;
}

// ─── 体重管理分析接口 ───
export interface WeightAnalysisResult {
  bmi: number;
  bmiCategory: string;
  bmiCategoryLabel: string;
  tcmBodyType: string;
  tcmPattern: string;
  spleenStomachAnalysis: string;
  dampnessLevel: string;
  dietaryAdvice: string;
  acupoints: string[];
  exerciseAdvice: string;
  herbSuggestions: string[];
  neijingQuotes: string[];
}

// ─── BMI分级 ───
interface BmiGrade {
  label: string;
  tcmBodyType: string;
  tcmPattern: string;
  spleenStomachNote: string;
  dampnessNote: string;
  dietaryAdvice: string;
  acupoints: string[];
  exerciseAdvice: string;
  herbSuggestions: string[];
  neijingQuotes: string[];
}

const BMI_GRADES: Record<string, BmiGrade> = {
  severeThin: {
    label: '严重消瘦',
    tcmBodyType: '脾虚消瘦',
    tcmPattern: '脾胃虚弱，气血生化乏源',
    spleenStomachNote: '脾失健运，水谷精微不能充养肌肉',
    dampnessNote: '脾虚生湿，或阴虚燥热',
    dietaryAdvice: '宜健脾益气、滋阴养血：山药、大枣、黄芪炖鸡、小米粥、当归生姜羊肉汤。少食多餐，细嚼慢咽。',
    acupoints: ['足三里', '中脘', '气海', '脾俞', '胃俞'],
    exerciseAdvice: '宜温和运动养气血：太极拳、八段锦、散步。避免剧烈运动耗气。',
    herbSuggestions: ['黄芪', '党参', '白术', '茯苓', '当归', '熟地'],
    neijingQuotes: ['《素问·痿论》："脾主身之肌肉。"', '《灵枢·本神》："脾气虚则四肢不用。"'],
  },
  thin: {
    label: '偏瘦',
    tcmBodyType: '阴虚消瘦',
    tcmPattern: '阴液亏虚，形体失养',
    spleenStomachNote: '胃阴不足，受纳腐熟功能偏弱',
    dampnessNote: '偏燥，津液不足',
    dietaryAdvice: '宜滋阴养胃：银耳、百合、沙参、麦冬、鸭肉、蜂蜜。忌辛辣燥热。',
    acupoints: ['三阴交', '太溪', '足三里', '胃俞'],
    exerciseAdvice: '宜游泳、瑜伽等柔缓运动，避免大汗伤阴。',
    herbSuggestions: ['沙参', '麦冬', '玉竹', '石斛', '枸杞'],
    neijingQuotes: ['《素问·阴阳应象大论》："形不足者，温之以气；精不足者，补之以味。"'],
  },
  normal: {
    label: '正常',
    tcmBodyType: '平和',
    tcmPattern: '阴阳调和，形气相符',
    spleenStomachNote: '脾胃运化正常，水谷精微输布有序',
    dampnessNote: '燥湿适中',
    dietaryAdvice: '五谷为养，五果为助，五畜为益，五菜为充。均衡饮食，顺应四时。',
    acupoints: ['足三里', '关元'],
    exerciseAdvice: '适度运动，保持活力。每周3-5次有氧运动。',
    herbSuggestions: ['山药', '大枣', '枸杞（少量）'],
    neijingQuotes: ['《素问·上古天真论》："食饮有节，起居有常，不妄作劳。"'],
  },
  overweight: {
    label: '超重',
    tcmBodyType: '脂人',
    tcmPattern: '痰湿内蕴，脾虚湿盛',
    spleenStomachNote: '脾主运化功能减弱，水湿内停化为痰浊',
    dampnessNote: '湿气偏盛，困阻脾阳',
    dietaryAdvice: '宜健脾祛湿、化痰降脂：薏仁、冬瓜、陈皮、荷叶、赤小豆、山楂。忌肥甘厚味、冷饮。',
    acupoints: ['丰隆', '阴陵泉', '中脘', '天枢', '足三里'],
    exerciseAdvice: '宜出汗运动排湿：快走、慢跑、骑行、游泳。每周至少5次，每次30分钟以上。',
    herbSuggestions: ['薏苡仁', '茯苓', '陈皮', '泽泻', '荷叶', '山楂'],
    neijingQuotes: ['《灵枢·卫气失常》："脂人者，虽脂不能大者，血清气滑少。"', '《素问·通评虚实论》："肥贵人则高粱之疾也。"'],
  },
  obeseI: {
    label: '肥胖I级',
    tcmBodyType: '膏人',
    tcmPattern: '痰瘀互结，脾肾阳虚',
    spleenStomachNote: '脾阳虚衰，运化无权，痰湿膏脂积聚',
    dampnessNote: '痰湿壅盛，兼有寒象',
    dietaryAdvice: '宜温阳化气、祛痰逐瘀：生姜、肉桂、陈皮、茯苓、薏仁、山楂、决明子。严格忌口生冷甜腻。',
    acupoints: ['丰隆', '阴陵泉', '中脘', '天枢', '关元', '命门', '脾俞'],
    exerciseAdvice: '宜坚持有氧+力量结合：快走+深蹲，每周5-6次。运动后微汗为宜，不可大汗亡阳。',
    herbSuggestions: ['茯苓', '桂枝', '白术', '泽泻', '丹参', '山楂', '决明子'],
    neijingQuotes: ['《灵枢·卫气失常》："膏者，多气而皮纵缓，故能纵腹垂腴。"', '《素问·奇病论》："此人必数食甘美而多肥也。"', '《素问·生气通天论》："高粱之变，足生大丁。"'],
  },
  obeseII: {
    label: '肥胖II级',
    tcmBodyType: '肉人',
    tcmPattern: '痰瘀阻络，三焦气化失常',
    spleenStomachNote: '脾胃严重受损，痰湿瘀毒互结，影响全身气机',
    dampnessNote: '痰湿壅盛，气化不利',
    dietaryAdvice: '宜破瘀化痰、通利三焦：山楂、丹参、三七、薏仁、冬瓜皮、玉米须、莱菔子。严格控食，配合药膳调理。',
    acupoints: ['丰隆', '阴陵泉', '中脘', '天枢', '关元', '命门', '三焦俞', '水道'],
    exerciseAdvice: '宜循序渐进增加运动量：从快走开始，逐步增加游泳、骑行。忌久坐不动。',
    herbSuggestions: ['茯苓', '泽泻', '白术', '桂枝', '丹参', '山楂', '决明子', '大黄（制）'],
    neijingQuotes: ['《灵枢·卫气失常》："肉人者，上下容大。"', '《素问·通评虚实论》："凡治消瘅仆击，偏枯痿厥，气满发逆，甘肥贵人，则高粱之疾也。"'],
  },
};

function getBmiGrade(bmi: number): BmiGrade {
  if (bmi < 16) return BMI_GRADES.severeThin;
  if (bmi < 18.5) return BMI_GRADES.thin;
  if (bmi < 24) return BMI_GRADES.normal;
  if (bmi < 28) return BMI_GRADES.overweight;
  if (bmi < 32) return BMI_GRADES.obeseI;
  return BMI_GRADES.obeseII;
}

// ─── 主接口 ───
export interface HealthAnalysisResult {
  targetDate: string;
  yearGan: string; yearZhi: string;
  yearYun: string;
  sitian: string; zaiquan: string;
  mainYun: string; keQi: string;
  hostQi: { name: string; wuxing: string; desc: string }[];
  guestQi: { name: string; wuxing: string }[];
  currentStep: number;
  // Birth year wuyunliuqi
  birthYear?: number;
  birthYun?: { gan: string; zhi: string; yearYun: string; sitian: string; zaiquan: string; analysis: string };
  // Bazi wuxing
  baziWuxing?: Record<string, number>;
  // 燥湿分析
  drynessDampness?: { level: string; desc: string; advice: string };
  constitution: { primary: string; scores: Record<string, number> };
  organStatus: Record<string, { status: string; advice: string; acupoints: { name: string; effect: string }[]; detail: string }>;
  symptomMatches: { symptom: string; pattern: string; organs: string[]; acupoints: string[]; advice: string }[];
  qijing: { name: string; function: string; keyPoint: string }[];
  dailyTip: string;
  yunAnalysis: string;
  qiAnalysis: string;
  combinedAnalysis: string;
  summary: string;
  weightAnalysis?: WeightAnalysisResult;
}

export interface SymptomInput {
  symptom: string;
  duration?: string;
  severity?: '轻' | '中' | '重';
  birthDate?: string;
  gender?: number;
}

@Injectable()
export class HealthCalculatorService {
  analyze(targetDate: string, baziWuxing?: Record<string, number>, symptoms?: SymptomInput[], birthDate?: string, height?: number, weight?: number): HealthAnalysisResult {
    const [y, m, d] = targetDate.split('-').map(Number);
    const { gan, zhi } = getYearGanZhi(y);
    const yunInfo = TIAN_GAN_HUA_YUN[gan] || TIAN_GAN_HUA_YUN['甲'];
    const qiInfo = DI_ZHI_HUA_QI[zhi] || DI_ZHI_HUA_QI['子'];
    const yearYun = `${yunInfo.yun}${yunInfo.taiguoOrBurji}`;

    // Birth year analysis
    let birthYun: HealthAnalysisResult['birthYun'];
    if (birthDate) {
      const [by] = birthDate.split('-').map(Number);
      const birthGz = getYearGanZhi(by);
      const birthYunInfo = TIAN_GAN_HUA_YUN[birthGz.gan] || TIAN_GAN_HUA_YUN['甲'];
      const birthQiInfo = DI_ZHI_HUA_QI[birthGz.zhi] || DI_ZHI_HUA_QI['子'];
      const birthYearYun = `${birthYunInfo.yun}${birthYunInfo.taiguoOrBurji}`;
      const birthWx = birthYunInfo.wuxing;
      const birthOrgan = WUXING_ORGAN_MAP[birthWx]?.organ || '未知';
      birthYun = {
        gan: birthGz.gan, zhi: birthGz.zhi,
        yearYun: birthYearYun, sitian: birthQiInfo.sitian, zaiquan: birthQiInfo.zaiquan,
        analysis: `${birthGz.gan}${birthGz.zhi}年生，先天岁运${birthYearYun}。${birthQiInfo.sitian}司天，${birthQiInfo.zaiquan}在泉。先天${birthWx}气${birthYunInfo.taiguoOrBurji === '太过' ? '偏盛' : '偏弱'}，体质基础偏向${birthOrgan}系统${birthYunInfo.taiguoOrBurji === '太过' ? '易亢进' : '易不足'}。`,
      };
    }

    // 燥湿分析
    const drynessDampness = this.analyzeDrynessDampness(yunInfo, qiInfo, baziWuxing);

    const hostQi = ZHU_QI_6.map(q => ({ name: q.name, wuxing: q.wuxing, desc: q.desc }));
    const guestQi = getKeQiSteps(qiInfo.sitian);
    const currentStep = getCurrentZhuQiStep(m, d);
    const mainYun = WU_YIN_JIAN_YUN[(currentStep < 2 ? 0 : currentStep < 4 ? 2 : 4)];

    // 体质分析（结合先天+当前+八字）
    const constitution = this.analyzeConstitution(yunInfo, qiInfo, baziWuxing);

    // 脏腑状态 — 综合先天运气 + 当前运气 + 八字五行
    const birthWeights = birthYun ? this.getBirthYearWeights(birthYun) : {};
    const currentWeights = getOrganImpactWeights(yearYun, qiInfo.sitian);
    const organWeights: Record<string, number> = { '肝': 0, '心': 0, '脾': 0, '肺': 0, '肾': 0 };
    for (const organ of Object.keys(organWeights)) {
      organWeights[organ] = (birthWeights[organ] || 0) * 1.5 + (currentWeights[organ] || 0) + (baziWuxing ? (baziWuxing[this.organToWuxing(organ)] || 0) * 2 : 0);
    }
    const organStatus: HealthAnalysisResult['organStatus'] = {};
    for (const [wx, detail] of Object.entries(WUXING_ORGAN_MAP)) {
      const weight = organWeights[detail.organ] || 0;
      const maxW = Math.max(...Object.values(organWeights), 1);
      const normalizedW = weight / maxW;
      const birthImpact = birthWeights[detail.organ] ? `先天${birthYun?.yearYun}影响脏腑基础` : '';
      const baziImpact = baziWuxing && baziWuxing[wx] ? `八字${wx}行${baziWuxing[wx]}个` : '';
      const status = normalizedW >= 0.8 ? '过旺' : normalizedW <= 0.35 ? '过弱' : '平和';
      organStatus[detail.organ] = {
        status,
        advice: status === '过旺' ? detail.dietExcess : status === '过弱' ? detail.dietDeficiency : '保持当前状态，注意节气变化',
        acupoints: detail.keyAcupoints.map(a => ({ name: a.name, effect: a.effect })),
        detail: [birthImpact, baziImpact, `${detail.function}`].filter(Boolean).join('；'),
      };
    }

    const symptomMatches = (symptoms || []).map(s => this.matchSymptom(s.symptom)).filter(Boolean) as HealthAnalysisResult['symptomMatches'];

    const currentStepInfo = hostQi[currentStep];
    const currentGuestQi = guestQi[currentStep];
    const birthNote = birthYun ? ` | 先天岁运${birthYun.yearYun}` : '';
    const dailyTip = `当前主气：${currentStepInfo.name}(${currentStepInfo.wuxing})，客气：${currentGuestQi.name}(${currentGuestQi.wuxing})。${currentStepInfo.desc}。当前岁运${yearYun}${birthNote}。${qiInfo.sitian}司天，${qiInfo.zaiquan}在泉。${this.getStepHealthTip(currentStep, yearYun, qiInfo)}`;

    const yunAnalysis = `${gan}年当前岁运${yearYun}。${yunInfo.taiguoOrBurji === '太过' ? '太过之年' + yunInfo.wuxing + '气过盛' : '不及之年' + yunInfo.wuxing + '气不足'}。${birthYun ? `用户生于${birthYun.analysis}` : ''}`;
    const qiAnalysis = `${zhi}年，${qiInfo.sitian}司天（上半年${qiInfo.sitianWuxing}气偏盛），${qiInfo.zaiquan}在泉（下半年${qiInfo.zaiquanWuxing}气偏盛）。`;
    const combinedAnalysis = this.buildCombinedAnalysis(yearYun, qiInfo, birthYun, baziWuxing, drynessDampness);
    const summary = `${yearYun}，${qiInfo.sitian}司天。${birthYun ? `生于${birthYun.gan}${birthYun.zhi}年${birthYun.yearYun}。` : ''}体质：${constitution.primary}。${drynessDampness?.desc || ''}`;

    const weightAnalysis = (height && weight) ? this.analyzeWeight(height, weight, baziWuxing, yearYun, qiInfo.sitian, constitution.primary, drynessDampness) : undefined;

    return {
      targetDate, yearGan: gan, yearZhi: zhi, yearYun,
      sitian: qiInfo.sitian, zaiquan: qiInfo.zaiquan,
      mainYun, keQi: currentGuestQi.name,
      hostQi, guestQi, currentStep,
      birthYear: birthDate ? parseInt(birthDate.split('-')[0]) : undefined,
      birthYun, baziWuxing,
      drynessDampness,
      constitution,
      organStatus, symptomMatches,
      qijing: QI_JING_BA_MAI,
      dailyTip, yunAnalysis, qiAnalysis, combinedAnalysis, summary,
      weightAnalysis,
    };
  }

  private organToWuxing(organ: string): string {
    for (const [wx, d] of Object.entries(WUXING_ORGAN_MAP)) {
      if (d.organ === organ) return wx;
    }
    return '土';
  }

  private getBirthYearWeights(birthYun: NonNullable<HealthAnalysisResult['birthYun']>): Record<string, number> {
    const wx = TIAN_GAN_HUA_YUN[birthYun.gan]?.wuxing || '土';
    const siWx = DI_ZHI_HUA_QI[birthYun.zhi]?.sitianWuxing || '火';
    const zaWx = DI_ZHI_HUA_QI[birthYun.zhi]?.zaiquanWuxing || '金';
    const w: Record<string, number> = { '肝': 0, '心': 0, '脾': 0, '肺': 0, '肾': 0 };
    w[WUXING_ORGAN_MAP[wx]?.organ || '脾'] = 3;
    w[WUXING_ORGAN_MAP[siWx]?.organ || '心'] = 1;
    w[WUXING_ORGAN_MAP[zaWx]?.organ || '肺'] = 1;
    return w;
  }

  /** 燥湿分析 */
  private analyzeDrynessDampness(
    yunInfo: { wuxing: string; taiguoOrBurji: string },
    qiInfo: { sitianWuxing: string; zaiquanWuxing: string; sitian: string; zaiquan: string },
    baziWuxing?: Record<string, number>,
  ): { level: string; desc: string; advice: string } {
    let dryScore = 0, dampScore = 0;
    // 岁运影响
    if (yunInfo.wuxing === '火' || yunInfo.wuxing === '金') dryScore += yunInfo.taiguoOrBurji === '太过' ? 3 : 1;
    if (yunInfo.wuxing === '水' || yunInfo.wuxing === '土') dampScore += yunInfo.taiguoOrBurji === '太过' ? 3 : 1;
    // 司天在泉
    if (qiInfo.sitian.includes('燥')) dryScore += 3;
    if (qiInfo.sitian.includes('湿')) dampScore += 3;
    if (qiInfo.zaiquan.includes('燥')) dryScore += 2;
    if (qiInfo.zaiquan.includes('湿')) dampScore += 2;
    if (qiInfo.sitian.includes('火')) dryScore += 2;
    if (qiInfo.sitian.includes('寒')) dampScore += 1;
    // 八字
    if (baziWuxing) {
      dryScore += (baziWuxing['火'] || 0) + (baziWuxing['金'] || 0) * 0.5;
      dampScore += (baziWuxing['水'] || 0) + (baziWuxing['土'] || 0) * 0.5;
    }

    const diff = dryScore - dampScore;
    if (diff >= 5) return { level: '燥盛', desc: '燥气偏盛，易伤津液。肺金受燥，大肠传导失常。', advice: '宜滋阴润燥，多食银耳、百合、梨、蜂蜜。忌辛辣燥热。可按摩太渊、列缺穴。' };
    if (diff >= 2) return { level: '偏燥', desc: '略有燥象，津液偏亏。注意肺脏和皮肤滋润。', advice: '增加水分摄入，多食白色食物（银耳、山药）。避免过度出汗。' };
    if (diff <= -5) return { level: '湿盛', desc: '湿气偏盛，易困脾阳。脾失健运，水湿内停。', advice: '宜健脾祛湿，多食薏仁、茯苓、赤小豆、冬瓜。忌生冷油腻。可艾灸足三里、阴陵泉。' };
    if (diff <= -2) return { level: '偏湿', desc: '略有湿象，脾胃运化稍弱。', advice: '饮食清淡，少食多餐。适当运动排汗祛湿。可按揉中脘穴。' };
    return { level: '燥湿适中', desc: '燥湿相对平衡，津液输布正常。', advice: '保持当前饮食起居习惯，注意节气变化适时调整。' };
  }

  private buildCombinedAnalysis(
    yearYun: string, qiInfo: { sitian: string; zaiquan: string; sitianWuxing: string; zaiquanWuxing: string },
    birthYun?: HealthAnalysisResult['birthYun'], baziWuxing?: Record<string, number>,
    drynessDampness?: HealthAnalysisResult['drynessDampness'],
  ): string {
    const parts: string[] = [];
    parts.push(`当前岁运${yearYun}，${qiInfo.sitian}司天，${qiInfo.zaiquan}在泉。`);
    if (birthYun) parts.push(`先天体质基础：${birthYun.analysis}`);
    if (baziWuxing) {
      const wxDesc = Object.entries(baziWuxing).filter(([, v]) => v > 0).map(([k, v]) => `${k}${v}`).join('、');
      parts.push(`八字五行分布：${wxDesc}。`);
    }
    if (drynessDampness) parts.push(`燥湿分析：${drynessDampness.level} — ${drynessDampness.desc}`);
    return parts.join('\n');
  }

  private analyzeConstitution(
    yunInfo: { yun: string; wuxing: string; taiguoOrBurji: string },
    _qiInfo: { sitian: string; zaiquan: string; sitianWuxing: string; zaiquanWuxing: string },
    baziWuxing?: Record<string, number>,
  ): { primary: string; scores: Record<string, number> } {
    const scores: Record<string, number> = {};
    for (const key of Object.keys(CONSTITUTION_TYPES)) scores[key] = 0;
    scores['平和质'] = 30; // baseline

    // Year yun influence
    if (yunInfo.taiguoOrBurji === '太过') {
      scores['湿热质'] += 15;
      scores['阴虚质'] += 10;
    } else {
      scores['气虚质'] += 15;
      scores['阳虚质'] += 10;
    }
    if (yunInfo.wuxing === '土' && yunInfo.taiguoOrBurji === '不及') scores['痰湿质'] += 20;
    if (yunInfo.wuxing === '火' && yunInfo.taiguoOrBurji === '太过') scores['阴虚质'] += 15;
    if (yunInfo.wuxing === '水' && yunInfo.taiguoOrBurji === '太过') scores['阳虚质'] += 15;

    // Bazi wuxing influence
    if (baziWuxing) {
      const total = Object.values(baziWuxing).reduce((a, b) => a + b, 0) || 1;
      if ((baziWuxing['木'] || 0) / total > 0.25) { scores['气郁质'] += 10; scores['平和质'] -= 5; }
      if ((baziWuxing['火'] || 0) / total > 0.25) { scores['阴虚质'] += 10; scores['湿热质'] += 5; }
      if ((baziWuxing['土'] || 0) / total > 0.3) { scores['痰湿质'] += 15; scores['平和质'] -= 5; }
      if ((baziWuxing['金'] || 0) / total > 0.25) { scores['阴虚质'] += 10; scores['气虚质'] += 5; }
      if ((baziWuxing['水'] || 0) / total > 0.25) { scores['阳虚质'] += 10; scores['血瘀质'] += 5; }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return { primary: sorted[0]?.[0] || '平和质', scores: Object.fromEntries(sorted) };
  }

  private matchSymptom(symptom: string) {
    const lower = symptom.toLowerCase();
    for (const mapping of SYMPTOM_MAP) {
      for (const kw of mapping.keywords) {
        if (lower.includes(kw)) {
          return {
            symptom,
            pattern: mapping.likelyPattern,
            organs: mapping.relatedOrgans,
            acupoints: mapping.acupoints,
            advice: mapping.advice,
          };
        }
      }
    }
    return { symptom, pattern: '需进一步辨证', organs: [], acupoints: [], advice: '建议咨询专业中医师进行四诊合参' };
  }

  private getStepHealthTip(step: number, yearYun: string, qiInfo: { sitian: string; zaiquan: string }): string {
    const tips = [
      '初之气，风气渐盛。宜早卧早起，广步于庭，披发缓形，以使志生。注意肝胆养护，可按摩太冲穴。',
      '二之气，火气上升。宜保持心情平和，避免暴怒伤肝。饮食清淡，少食辛辣。可按揉内关穴宁心安神。',
      '三之气，暑热当令。宜避暑降温，多饮温水。注意心脏养护，午间小憩养心。可按摩神门穴。',
      '四之气，湿气弥漫。宜健脾祛湿，饮食清淡忌油腻。适当运动排汗。可按揉足三里穴健脾胃。',
      '五之气，燥气当令。宜滋阴润燥，多食梨、银耳等白色食物。注意肺脏滋润。可按摩太渊穴补肺。',
      '终之气，寒气凛冽。宜早卧晚起，必待日光。注意保暖，尤其腰部足部。可艾灸关元穴温补肾阳。',
    ];
    return tips[step] || tips[0];
  }

  /** 体重管理分析 — 综合BMI + 八字五行 + 五运六气 + 体质 */
  analyzeWeight(
    height: number, weight: number,
    baziWuxing?: Record<string, number>,
    yearYun?: string, sitian?: string,
    constitutionPrimary?: string,
    drynessDampness?: { level: string; desc: string; advice: string },
  ): WeightAnalysisResult {
    const bmi = Math.round(weight / ((height / 100) ** 2) * 10) / 10;
    const grade = getBmiGrade(bmi);

    // 结合八字土行旺弱微调脾胃诊断
    const earthCount = baziWuxing?.['土'] || 0;
    const totalCount = baziWuxing ? Object.values(baziWuxing).reduce((a, b) => a + b, 0) || 1 : 1;
    const earthRatio = earthCount / totalCount;

    let spleenNote = grade.spleenStomachNote;
    if (earthRatio > 0.25 && bmi >= 24) {
      spleenNote += '八字土行偏旺，脾易生湿，痰湿更易积聚。';
    } else if (earthRatio < 0.1 && bmi < 18.5) {
      spleenNote += '八字土行不足，脾胃先天薄弱，肌肉难充。';
    }

    // 结合五运六气调整湿气诊断
    let dampnessNote = grade.dampnessNote;
    if (yearYun?.includes('土运太过') || sitian?.includes('太阴湿土')) {
      dampnessNote += '当前岁运/司天湿气偏盛，加重痰湿困脾。';
    } else if (yearYun?.includes('水运太过') || sitian?.includes('太阳寒水')) {
      dampnessNote += '当前寒水之气偏盛，寒湿相搏困遏脾阳。';
    } else if (drynessDampness?.level === '湿盛' || drynessDampness?.level === '偏湿') {
      dampnessNote += `燥湿分析提示${drynessDampness.level}，与体重偏颇相关。`;
    }

    // 综合体质
    let pattern = grade.tcmPattern;
    if (constitutionPrimary === '痰湿质' && bmi >= 24) pattern += '，体质辨证为痰湿质，痰湿肥胖风险高';
    else if (constitutionPrimary === '气虚质' && bmi >= 24) pattern += '，气虚推动无力，痰湿易停';
    else if (constitutionPrimary === '阳虚质' && bmi >= 24) pattern += '，阳虚不能化气，水湿内停成肥胖';
    else if (constitutionPrimary === '阴虚质' && bmi < 18.5) pattern += '，阴虚形体失养，消瘦难充';

    return {
      bmi,
      bmiCategory: grade.label,
      bmiCategoryLabel: grade.label,
      tcmBodyType: grade.tcmBodyType,
      tcmPattern: pattern,
      spleenStomachAnalysis: spleenNote,
      dampnessLevel: dampnessNote,
      dietaryAdvice: grade.dietaryAdvice,
      acupoints: grade.acupoints,
      exerciseAdvice: grade.exerciseAdvice,
      herbSuggestions: grade.herbSuggestions,
      neijingQuotes: grade.neijingQuotes,
    };
  }
}
