# Refik Anadol 연표

**한국어** | [English](en/02-timeline.md)

조사 기준일 2026-10-15. 구조화된 전체 목록은 `../data/works.json`, `../data/works.csv`에 있습니다.

## 전체 흐름

```mermaid
timeline
    title Refik Anadol 주요 연표 (1985~2026)
    1985 : 이스탄불 출생
    2008 : 첫 야외 프로젝션, "데이터 페인팅" 용어 사용
    2010 : Quadrature (santralistanbul)
    2011 : Augmented Structures v1.0 (이스탄불 비엔날레)
    2012 : UCLA DMA 입학, Infinity Room 개발
    2014 : Visions of America - Amériques (WDCH) : Refik Anadol Studio 설립
    2015 : Infinity Room 공개 (이스탄불 비엔날레)
    2016 : Google AMI 첫 레지던시
    2017 : Wind of Boston : Archive Dreaming (SALT, 170만 문서)
    2018 : Melting Memories : WDCH Dreams (LA Phil 100주년)
    2019 : Machine Hallucinations - NYC : Latent History (Fotografiska) : Lumen Prize Gold
    2020 : Quantum Memories (NGV) : 첫 NFT
    2021 : Machine Hallucinations - Nature Dreams : Casa Batlló 레지던시
    2022 : Living Architecture - Casa Batlló : Unsupervised (MoMA 개막)
    2023 : Living Paintings (Jeffrey Deitch) : Unsupervised MoMA 소장 : Machine Hallucinations - Sphere
    2024 : Large Nature Model (다보스) : Echoes of the Earth (Serpentine) : LNM Coral (UN)
    2025 : Living Architecture - Gehry (구겐하임 빌바오) : Biophilia (베네치아) : Messi 데이터 조각 : TIME100 Impact Award
    2026 : DATALAND 개관 (6월 20일) : Machine Dreams - Rainforest
```

## 기법의 진화

```mermaid
flowchart LR
    A["2008~2015<br/>프로젝션 매핑<br/>건축 = 캔버스"] --> B["2016~2018<br/>t-SNE, DCGAN<br/>아카이브 = 우주"]
    B --> C["2019~2023<br/>StyleGAN2-ADA, UMAP<br/>GPU 유체 솔버<br/>잠재 공간 = 꿈"]
    C --> D["2024~<br/>자체 모델 LNM, LAM<br/>확산 모델 미세조정<br/>허가 기반 데이터"]
    D --> E["2026<br/>DATALAND<br/>웨어러블 + 실시간 생태 데이터"]
```

## 2022~2026 주요 전시 기간

```mermaid
gantt
    dateFormat YYYY-MM-DD
    axisFormat %Y-%m
    title 주요 전시 기간 (확인된 일정만)
    section MoMA
    Unsupervised                :2022-11-19, 2023-10-29
    section Sphere
    Machine Hallucinations Sphere :2023-09-01, 120d
    section 런던
    Echoes of the Earth (Serpentine) :2024-02-16, 2024-04-07
    section 리버사이드
    Keystone-Mast AI Data Painting :2024-09-21, 2025-12-15
    section 빌바오
    Living Architecture Gehry   :2025-03-07, 2025-10-19
    section 베네치아
    Living Architecture Biophilia :2025-05-10, 2025-11-23
    section LA
    DATALAND Machine Dreams Rainforest :2026-06-20, 2027-01-31
```

참고: Sphere 작업 기간은 Wikipedia의 "4개월 설치" 기술에 근거한 근사치입니다. 작가 사이트는 "2023-09-01부터 진행 중"으로 표기합니다.
