from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import jieba
import jieba.posseg as pseg
import re
import os
import httpx

app = FastAPI(title="CausalCanvas - 交互式知识重构工具")

frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


class TextInput(BaseModel):
    text: str


class Edge(BaseModel):
    id: str
    source: str
    target: str
    relation: str


class Node(BaseModel):
    id: str
    label: str
    type: str
    x: float
    y: float


class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


class ReportRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class AIReportRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    api_key: str
    model: str = "deepseek-chat"


class AIRewriteRequest(BaseModel):
    text: str
    style: str
    api_key: str
    model: str = "deepseek-chat"


class AIExpandRequest(BaseModel):
    node_label: str
    context: str
    api_key: str
    model: str = "deepseek-chat"


class ExtractedEntity(BaseModel):
    text: str
    type: str
    count: int


class AnalysisResult(BaseModel):
    entities: List[ExtractedEntity]
    keywords: List[str]


PERSON_PATTERNS = [
    r'[李王张刘陈杨黄赵周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文][a-zA-Z\u4e00-\u9fa5]{1,3}',
]

EVENT_PATTERNS = [
    r'[^。！？\s]*?(?:革命|战争|起义|政变|改革|运动|事件|危机|灾难|事故|爆发|发生|开始|结束|成立|解散)[^。！？\s]*',
    r'[^。！？\s]*?(?:宣布|决定|签署|发表|发布|提出|通过|实施|执行)[^。！？\s]*',
]


def extract_entities(text: str) -> AnalysisResult:
    entities_dict: Dict[str, Dict] = {}

    for pattern in PERSON_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if len(match) >= 2 and len(match) <= 4:
                if match in entities_dict:
                    entities_dict[match]["count"] += 1
                else:
                    entities_dict[match] = {
                        "text": match,
                        "type": "person",
                        "count": 1
                    }

    for pattern in EVENT_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if len(match) >= 4:
                if match in entities_dict:
                    entities_dict[match]["count"] += 1
                else:
                    entities_dict[match] = {
                        "text": match,
                        "type": "event",
                        "count": 1
                    }

    words = jieba.lcut(text)
    stop_words = set([
        "的", "了", "是", "在", "我", "有", "和", "就",
        "不", "人", "都", "一", "一个", "上", "也", "很",
        "到", "说", "要", "去", "你", "会", "着", "没有",
        "看", "好", "自己", "这", "那", "他", "她", "它",
        "们", "这个", "那个", "什么", "怎么", "为什么",
        "哪", "哪里", "谁", "多少", "几", "啊", "吧", "呢",
        "吗", "呀", "哦", "嗯", "哈", "啦", "喽", "呗",
        "与", "或", "及", "以及", "而且", "但是", "然而",
        "如果", "因为", "所以", "虽然", "但是", "即使",
        "不但", "而且", "或者", "还是", "要么", "与其",
        "不如", "既然", "那么", "只要", "只有", "除非",
        "无论", "不管", "即使", "纵然", "纵使", "就是",
        "便", "才", "也", "还", "都", "就", "又", "再",
        "已", "已经", "正在", "将要", "曾经", "曾", "刚",
        "刚刚", "正在", "正", "将", "要", "会", "能",
        "可以", "能够", "应该", "必须", "得", "需要",
        "可能", "也许", "大概", "大约", "似乎", "好像",
        "是", "为", "以为", "认为", "觉得", "感到",
        "有", "具有", "拥有", "存在", "出现", "发生",
        "进行", "开展", "实施", "执行", "采取", "采用",
        "把", "被", "让", "给", "向", "对", "对于", "关于",
        "跟", "和", "同", "与", "及", "以及", "及其",
        "之", "的", "地", "得", "所", "者", "以", "于",
        "而", "且", "或", "等", "等等", "之类", "等等",
        "第", "其次", "首先", "第一", "第二", "第三",
        "最后", "最终", "终于", "总之", "总而言之",
        "因此", "因而", "故而", "所以", "于是", "从而",
        "进而", "此外", "另外", "再者", "况且", "何况",
        "尤其", "特别", "甚至", "更是", "极其", "相当",
        "非常", "很", "太", "最", "更", "还", "比较",
        "稍微", "略微", "几乎", "差不多", "简直", "完全",
        "全部", "所有", "一切", "整个", "全体", "每个",
        "各个", "各种", "各类", "种种", "许多", "很多",
        "不少", "少量", "少许", "一些", "有些", "有的",
        "某个", "某些", "某", "本", "该", "此", "这",
        "那", "其", "它", "他", "她", "们", "等", "号",
        "年", "月", "日", "时", "分", "秒", "点", "半",
    ])

    nouns = []
    for word, flag in pseg.cut(text):
        if flag.startswith('n') and len(word) >= 2 and word not in stop_words:
            if word not in [e["text"] for e in entities_dict.values()]:
                if word in entities_dict:
                    entities_dict[word]["count"] += 1
                else:
                    entities_dict[word] = {
                        "text": word,
                        "type": "noun",
                        "count": 1
                    }
                nouns.append(word)

    entities = sorted(
        entities_dict.values(),
        key=lambda x: x["count"],
        reverse=True
    )

    keywords = list(set(nouns))[:30]

    return AnalysisResult(entities=entities, keywords=keywords)


@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_path = os.path.join(frontend_path, "index.html")
    return FileResponse(index_path)


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_text(input_data: TextInput):
    if not input_data.text.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")

    try:
        result = extract_entities(input_data.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@app.post("/api/generate-report")
async def generate_report(data: ReportRequest):
    nodes = data.nodes
    edges = data.edges

    if not nodes:
        return {"report": "画布上没有节点，请先添加节点。"}

    node_dict = {node["id"]: node for node in nodes}

    relation_templates = {
        "导致": "{}导致了{}的发生。",
        "造成": "{}造成了{}。",
        "导火索": "{}成为了{}的导火索。",
        "影响": "{}对{}产生了重要影响。",
        "促使": "{}促使了{}的发展。",
        "引发": "{}引发了{}。",
        "推动": "{}推动了{}的进程。",
        "阻碍": "{}阻碍了{}的发展。",
        "起源于": "{}起源于{}。",
        "结果是": "{}的结果是{}。",
    }

    report_parts = []

    persons = [n["label"] for n in nodes if n.get("type") == "person"]
    events = [n["label"] for n in nodes if n.get("type") == "event"]
    nouns = [n["label"] for n in nodes if n.get("type") == "noun"]

    intro = "本报告总结了以下关键要素："
    if persons:
        intro += f"\n\n主要人物：{', '.join(persons)}。"
    if events:
        intro += f"\n\n关键事件：{', '.join(events)}。"
    if nouns:
        intro += f"\n\n重要概念：{', '.join(nouns)}。"

    report_parts.append(intro)

    if edges:
        report_parts.append("\n\n---\n\n关系分析：")
        for edge in edges:
            source_id = edge.get("source")
            target_id = edge.get("target")
            relation = edge.get("relation", "影响")

            if source_id in node_dict and target_id in node_dict:
                source_label = node_dict[source_id]["label"]
                target_label = node_dict[target_id]["label"]

                template = relation_templates.get(
                    relation, "{}与{}之间存在{}关系。")
                if relation not in relation_templates:
                    sentence = f"{source_label}与{target_label}之间存在{relation}关系。"
                else:
                    sentence = template.format(source_label, target_label)

                report_parts.append(f"\n- {sentence}")
    else:
        report_parts.append(
            "\n\n提示：目前还没有建立节点之间的关系连线。请通过拖拽连线来建立节点之间的因果或逻辑关系，以生成更完整的分析报告。")

    full_report = "".join(report_parts)

    return {"report": full_report}


async def call_deepseek_api(
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.7
) -> str:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                DEEPSEEK_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"DeepSeek API错误: {e.response.text}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"调用DeepSeek API失败: {str(e)}"
            )


@app.post("/api/ai-generate-report")
async def ai_generate_report(data: AIReportRequest):
    if not data.api_key:
        raise HTTPException(status_code=400, detail="请提供DeepSeek API Key")
    
    nodes = data.nodes
    edges = data.edges
    
    if not nodes:
        return {"report": "画布上没有节点，请先添加节点。"}
    
    node_dict = {node["id"]: node for node in nodes}
    
    graph_description = "以下是因果图谱中的节点和关系：\n\n"
    
    graph_description += "【节点列表】\n"
    for node in nodes:
        node_type = node.get("type", "unknown")
        type_label = {
            "person": "人物",
            "event": "事件",
            "noun": "概念"
        }.get(node_type, "其他")
        graph_description += f"- {node['label']} ({type_label})\n"
    
    if edges:
        graph_description += "\n【关系连线】\n"
        for edge in edges:
            source_id = edge.get("source")
            target_id = edge.get("target")
            relation = edge.get("relation", "影响")
            
            if source_id in node_dict and target_id in node_dict:
                source_label = node_dict[source_id]["label"]
                target_label = node_dict[target_id]["label"]
                graph_description += f"- {source_label} {relation} {target_label}\n"
    
    system_prompt = """你是一位专业的知识分析师和报告撰写专家。请根据用户提供的因果图谱数据，生成一份结构清晰、逻辑严谨的分析报告。

报告要求：
1. 首先概述图谱中的主要元素（人物、事件、概念）
2. 详细分析各节点之间的因果关系和逻辑链条
3. 识别关键的根因节点和结果节点
4. 如果存在循环因果关系，请特别指出并分析其影响
5. 语言风格要专业、清晰、易于理解
6. 报告结构要有条理，使用适当的标题和分段

请用中文撰写报告，字数在300-800字之间。"""

    user_prompt = f"请根据以下因果图谱数据生成一份分析报告：\n\n{graph_description}\n\n请生成完整的分析报告。"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        report = await call_deepseek_api(
            api_key=data.api_key,
            model=data.model,
            messages=messages
        )
        return {"report": report}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成报告失败: {str(e)}")


@app.post("/api/ai-rewrite")
async def ai_rewrite(data: AIRewriteRequest):
    if not data.api_key:
        raise HTTPException(status_code=400, detail="请提供DeepSeek API Key")
    
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="请提供需要改写的文本")
    
    style_descriptions = {
        "formal": "正式专业的商务风格，用词严谨、规范，适合正式报告和文档",
        "casual": "轻松通俗的口语化风格，用词简单、亲切，适合日常交流",
        "academic": "学术严谨的学术风格，逻辑严密、术语准确，适合学术论文",
        "creative": "创意生动的文学风格，富有想象力和感染力，适合创意写作"
    }
    
    style_desc = style_descriptions.get(data.style, style_descriptions["formal"])
    
    system_prompt = f"""你是一位专业的文本改写专家。请将用户提供的文本改写成{style_desc}。

改写要求：
1. 保持原文的核心意思不变
2. 调整用词和句式，使其符合指定的风格
3. 可以适当增加连接词和过渡语，使文本更加流畅
4. 保持原文的结构和逻辑
5. 用中文输出改写后的文本"""

    user_prompt = f"请改写以下文本：\n\n{data.text}\n\n改写后的文本："

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        rewritten_text = await call_deepseek_api(
            api_key=data.api_key,
            model=data.model,
            messages=messages
        )
        return {"rewritten_text": rewritten_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"改写失败: {str(e)}")


@app.post("/api/ai-expand")
async def ai_expand(data: AIExpandRequest):
    if not data.api_key:
        raise HTTPException(status_code=400, detail="请提供DeepSeek API Key")
    
    if not data.node_label.strip():
        raise HTTPException(status_code=400, detail="请提供需要扩写的节点名称")
    
    system_prompt = """你是一位专业的知识扩展专家。请根据用户提供的节点名称和上下文，对该节点进行详细的扩写说明。

扩写要求：
1. 介绍该节点的基本定义和概念
2. 分析该节点在整个因果关系中的地位和作用
3. 可以补充相关的背景知识和扩展信息
4. 语言要清晰、准确、有条理
5. 用中文输出，字数在150-300字之间"""

    context_info = f"\n\n上下文信息：{data.context}" if data.context else ""
    
    user_prompt = f"请详细扩写以下节点：{data.node_label}{context_info}\n\n扩写内容："

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        expanded_text = await call_deepseek_api(
            api_key=data.api_key,
            model=data.model,
            messages=messages
        )
        return {"expanded_text": expanded_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"扩写失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
