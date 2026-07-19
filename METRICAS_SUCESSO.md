# Métricas de Sucesso — Fishgada Map/Radar

## Métrica Norteadora

**Percentual de sessões no mapa que resultam em uma ação útil:**
> Abrir detalhes, salvar local, solicitar rota, registrar captura ou adicionar ponto.

---

## Métricas por Funcionalidade

| # | Métrica | Definição | Evento Analítico |
|---|---|---|---|
| 1 | Taxa de abertura de detalhes | % de usuários que abrem detalhes após visualizar o mapa | `marker_opened` / `map_viewed` |
| 2 | Taxa de abertura por marcador | Média de detalhes abertos por sessão | `place_details_opened` |
| 3 | Taxa de solicitação de rota | % de visualizações que geram clique em "Rota" | `route_requested` / `place_details_opened` |
| 4 | Taxa de início de captura | % de sessões com captura iniciada | `capture_started_from_map` / `map_viewed` |
| 5 | Taxa de conclusão de captura | % de capturas iniciadas que são concluídas | `capture_created` / `capture_started_from_map` |
| 6 | Taxa de adição de ponto | % de sessões com novo ponto adicionado | `place_added` |
| 7 | Uso de filtros | % de sessões com filtros aplicados | `filter_applied` |
| 8 | Conversão de filtros | % que usam filtro e abrem detalhes | `filter_applied` + `place_details_opened` |
| 9 | Retenção pós-captura | % que retornam após registrar captura | `capture_created` + sessão seguinte |
| 10 | Retenção pós-salvar local | % que retornam após salvar um local | `place_saved` + sessão seguinte |
| 11 | Cliques em parceiros | % de interações com marcadores de parceiros | `marker_opened` (place_type=partner) |
| 12 | Conversão de parceiros | % que clicam em parceiro e realizam ação | `marker_opened` (partner) → `route_requested` |

---

## Eventos Analíticos Implementados

| Evento | Propriedades | Disparo |
|---|---|---|
| `map_viewed` | — | Ao carregar o mapa |
| `species_searched` | `species` | Ao digitar no campo de busca |
| `filter_applied` | `filter_count`, + campos | Ao alterar filtros |
| `marker_opened` | `place_type` (public/community/private/partner) | Ao tocar em marcador |
| `place_details_opened` | `place_type` | Ao abrir bottom sheet/drawer |
| `route_requested` | `place_type` | Ao clicar "Traçar rota" |
| `place_saved` | `place_type` | Ao salvar local |
| `capture_started_from_map` | `place_type`, `source` | Ao clicar "Registrar Captura" no mapa |
| `capture_created` | `source`, `contributed` | Ao concluir captura |
| `place_added` | — | Ao adicionar ponto |
| `onboarding_completed` | — | Ao concluir onboarding do mapa |
| `onboarding_dismissed` | — | Ao pular onboarding do mapa |

---

## Definições Técnicas

- **Sessão**: Período contínuo de uso do mapa sem idle superior a 30 minutos.
- **Ação útil**: Qualquer uma das seguintes: abrir detalhes (`place_details_opened`), salvar local (`place_saved`), solicitar rota (`route_requested`), registrar captura (`capture_created`), adicionar ponto (`place_added`).
- **Taxa**: (evento alvo / evento de base) × 100.
- **Conversão de parceiros**: Cliques em parceiros que geram solicitação de rota ou contato.

> Nota: As métricas dependem da implementação de um serviço de analytics (GA4, Meta Pixel, ou similar). Os eventos estão preparados para serem consumidos por `gtag` ou `fbq`.
