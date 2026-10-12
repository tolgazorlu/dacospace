# Case · OpenAI global outage, December 11, 2024

**Category:** Production · **Lessons:** 01, 20 · **Severity:** ~4h22m fleet-wide outage, ChatGPT, API, and Sora all down

## The system

ChatGPT, the OpenAI API, and Sora, served across OpenAI's full production fleet, running on a Kubernetes-based control plane.

## What was observed

Between 3:16pm and 7:38pm PST on December 11, 2024, ChatGPT, the API, and Sora were significantly degraded or unavailable fleet-wide, OpenAI's longest outage to that point.

## Stop and think

1. If you build a product on a single LLM provider's API and that provider has a multi-hour fleet-wide outage with no advance warning, what is your system's actual behavior right now?
2. A new observability tool is meant to increase visibility into a system. What would have to go wrong for it to instead obscure the blast radius of an incident?
3. Engineers' primary tool for fixing the outage (`kubectl`) itself depends on the thing that broke. What does that imply about how remediation plans should be designed?

## What actually happened

Root cause: a new telemetry service, deployed to all clusters to improve Kubernetes-control-plane observability, caused every node to execute resource-intensive Kubernetes API operations whose cost scaled with cluster size. The largest clusters' API servers became overwhelmed, taking down the control plane. DNS caching delayed visibility of the problem as the rollout continued. ([OpenAI postmortem](https://status.openai.com/incidents/ctrsv3lwd797); [TechCrunch](https://techcrunch.com/2024/12/13/openai-blames-its-massive-chatgpt-outage-on-a-new-telemetry-service))

The incident was an infrastructure-observability change, not a model or security issue, and it produced a circular dependency: the control plane that manages rollback and remediation was itself the thing taken down, and the monitoring tool meant to increase visibility instead obscured the blast radius via DNS caching. Engineers were partly locked out because `kubectl` itself depends on a working control plane; root cause was identified within minutes of impact start, but full recovery took over 4 hours partly because the fix required access to the same control plane that had failed.

## Root causes

**Technical:** a new telemetry service's resource cost scaled with cluster size in a way that was not caught before fleet-wide deployment; DNS caching delayed the team's visibility into how far the problem had spread as rollout continued; the remediation path depended on the exact system component that had failed.

**Organizational:** the telemetry service was deployed to the full fleet rather than staged to a representative-sized cluster first, which is the gap OpenAI itself committed to closing afterward.

## What would have prevented it

- **Staged or canary rollout to a representative-sized cluster** before fleet-wide deployment of any infrastructure change, OpenAI's own stated commitment after the incident. This is the direct fix on the provider side.
- **For customers building on a single LLM provider**: health-checked automatic failover to a second provider or model, rather than retries against the same provider, since retries do nothing when the whole provider is down.
- **Graceful degradation** (cached or last-known-good responses, read-only mode, queuing) instead of hard failure, plus SLAs and incident-communication runbooks that assume the provider can be down for hours with no advance warning.

## The lesson for your system

- Single-provider dependence on a hosted LLM API carries the same multi-hour, fleet-wide outage risk as any other critical SaaS dependency; this incident is the canonical argument for provider-outage resilience.
- The outage originated in infrastructure layers (Kubernetes, DNS) that had nothing to do with the model itself; a "the model provider is reliable" assumption needs to account for the provider's entire infra stack, not just model quality.
- Build health-checked fallback to a second provider or model, and graceful degradation paths, before you need them, not during an outage.
- Test your own failover path deliberately (kill the primary provider connection in a drill) rather than waiting for a real multi-hour outage to discover it doesn't work.

## Sources

- [API, ChatGPT & Sora Facing Issues, postmortem](https://status.openai.com/incidents/ctrsv3lwd797) · OpenAI · Dec 2024
- [OpenAI blames its massive ChatGPT outage on a 'new telemetry service'](https://techcrunch.com/2024/12/13/openai-blames-its-massive-chatgpt-outage-on-a-new-telemetry-service) · TechCrunch · Dec 2024
