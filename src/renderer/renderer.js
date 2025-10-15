import { evaluate, sanitizeNumber } from '../shared/evaluator.js';

const $ = (id) => document.getElementById(id);
let hasEvaluated = false;

// 탭 전환 로직
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.dataset.tab;

    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    document.getElementById(`tab-${targetTab}`).classList.add('active');
  });
});

// 도움말 팝업 데이터
const helpContent = {
  pbr: {
    title: 'PBR (Price to Book Ratio, 주가순자산비율)',
    body: '주가를 주당순자산으로 나눈 값입니다. 기업의 순자산 대비 주가가 얼마나 높게 평가되고 있는지를 나타냅니다. 낮을수록 저평가된 것으로 판단할 수 있습니다.'
  },
  per: {
    title: 'PER (Price to Earnings Ratio, 주가수익비율)',
    body: '주가를 주당순이익으로 나눈 값입니다. 기업의 수익 대비 주가가 얼마나 높게 평가되고 있는지를 나타냅니다. 일반적으로 10~20 사이가 적정하다고 봅니다.'
  },
  roe: {
    title: 'ROE (Return on Equity, 자기자본이익률)',
    body: '당기순이익을 자기자본으로 나눈 비율(%)입니다. 기업이 자기자본을 활용해 얼마나 효율적으로 이익을 창출하는지를 나타냅니다. 높을수록 좋으며, 10% 이상이면 양호합니다.'
  },
  psr: {
    title: 'PSR (Price to Sales Ratio, 주가매출비율)',
    body: '주가를 주당매출액으로 나눈 값입니다. 매출 대비 주가 수준을 평가합니다. 적자 기업이나 성장주 분석에 유용하며, 낮을수록 저평가된 것으로 판단할 수 있습니다.'
  }
};

// 도움말 아이콘 클릭 이벤트
document.querySelectorAll('.help-icon').forEach(icon => {
  icon.addEventListener('click', () => {
    const helpKey = icon.dataset.help;
    const content = helpContent[helpKey];

    if (content) {
      $('modalTitle').textContent = content.title;
      $('modalBody').textContent = content.body;
      $('helpModal').classList.add('active');
    }
  });
});

// 모달 외부 클릭 시 닫기
$('helpModal').addEventListener('click', (e) => {
  if (e.target === $('helpModal')) {
    $('helpModal').classList.remove('active');
  }
});

// 토스트 알림 함수
function showToast(message, type = 'loading') {
  const toast = $('toast');
  const toastMessage = $('toastMessage');
  const toastIcon = $('toastIcon');

  toast.className = 'toast';
  toast.classList.add('active', type);
  toastMessage.textContent = message;

  // 아이콘 설정
  if (type === 'success') {
    toastIcon.textContent = '✓';
  } else if (type === 'error') {
    toastIcon.textContent = '✕';
  } else if (type === 'loading') {
    toastIcon.textContent = '...';
  }

  if (type !== 'loading') {
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3000);
  }

  return {
    hide: () => toast.classList.remove('active')
  };
}

function readMetrics() {
  return {
    marketCap: sanitizeNumber($('marketCap').value),
    dividendYield: sanitizeNumber($('dividendYield').value),
    aum: sanitizeNumber($('aum').value),
    nav: sanitizeNumber($('nav').value),
    premiumDiscount: sanitizeNumber($('premiumDiscount').value),
    fee: sanitizeNumber($('fee').value),
    pbr: sanitizeNumber($('pbr').value),
    per: sanitizeNumber($('per').value),
    roe: sanitizeNumber($('roe').value),
    psr: sanitizeNumber($('psr').value)
  };
}

function verdictBadge(verdict) {
  const cls = verdict === 'Good' ? 'good' : verdict === 'Meh' ? 'meh' : 'bad';
  return `<span class="badge ${cls}">${verdict}</span>`;
}

function renderLocal(res) {
  const s = res.subscores;
  return `
    <div><strong>로컬 스코어</strong>: ${res.score} / 100 ${verdictBadge(res.verdict)}</div>
    <div class="subgrid" style="margin-top:8px">
      <div>시총 ${Math.round(s.marketCap * 100)}</div>
      <div>배당 ${Math.round(s.dividendYield * 100)}</div>
      <div>AUM ${Math.round(s.aum * 100)}</div>
      <div>괴리 ${Math.round(s.premiumDiscount * 100)}</div>
      <div>보수 ${Math.round(s.fee * 100)}</div>
      <div>PBR ${Math.round(s.pbr * 100)}</div>
      <div>PER ${Math.round(s.per * 100)}</div>
      <div>ROE ${Math.round(s.roe * 100)}</div>
      <div>PSR ${Math.round(s.psr * 100)}</div>
    </div>
    ${res.suggestions.length ? `<div style="margin-top:8px"><small>제안: ${res.suggestions.join(' · ')}</small></div>` : ''}
  `;
}

function renderAI(ai) {
  if (!ai?.ok) return `<div style="margin-top:8px;color:#b42318"><small>AI 오류: ${ai?.error ?? '알 수 없음'}</small></div>`;
  const r = ai.result;
  const cls = r.verdict === 'Good' ? 'good' : r.verdict === 'Meh' ? 'meh' : 'bad';
  return `
    <div style="margin-top:12px"><strong>AI 최종평가</strong>: <span class="badge ${cls}">${r.verdict}</span> <small>신뢰도 ${r.confidence ?? '?'}%</small></div>
    <div style="margin-top:6px"><small>${r.reasoning ?? ''}</small></div>
    ${Array.isArray(r.risks) ? `<div style="margin-top:6px"><small>리스크: ${r.risks.join(' · ')}</small></div>` : ''}
    ${Array.isArray(r.improvements) ? `<div style="margin-top:6px"><small>개선/체크포인트: ${r.improvements.join(' · ')}</small></div>` : ''}
  `;
}

$('calc').addEventListener('click', async () => {
  const metrics = readMetrics();
  const local = evaluate(metrics);

  showToast('평가 계산 중...', 'loading');

  // 버튼 텍스트 변경
  if (!hasEvaluated) {
    $('calc').textContent = '다시 평가하기';
    hasEvaluated = true;
  }

  let resultHTML = renderLocal(local);

  // AI 평가 시도 (환경변수에 API key가 설정되어 있으면 자동으로 호출)
  const aiToast = showToast('AI 분석 중...', 'loading');

  try {
    console.log('AI 평가 시작:', { metrics, localScore: local.score });
    const ai = await window.api.aiEvaluate({ metrics, localScore: local.score });
    console.log('AI 평가 결과:', ai);

    aiToast.hide();

    if (ai?.ok) {
      showToast('AI 분석 완료!', 'success');
      resultHTML += renderAI(ai);
    } else {
      showToast('AI 분석 실패: ' + (ai?.error || '알 수 없는 오류'), 'error');
      resultHTML += renderAI(ai);
    }
  } catch (e) {
    console.error('AI 호출 오류:', e);
    aiToast.hide();
    showToast('AI 호출 실패: ' + String(e), 'error');
    resultHTML += `<div style="margin-top:8px;color:#b42318"><small>AI 호출 실패: ${String(e)}</small></div>`;
  }

  // 결과를 팝업으로 출력
  $('resultModalBody').innerHTML = resultHTML;
  $('resultModal').classList.add('active');
});

// 결과 모달 외부 클릭 시 닫기
$('resultModal').addEventListener('click', (e) => {
  if (e.target === $('resultModal')) {
    $('resultModal').classList.remove('active');
  }
});

