KOOK 开发者入门指南（接口规范与消息通知）



目标：帮助开发者在一天内完成从鉴权到消息收发的最小可用对接，实现对 KOOK 的 HTTP 接口调用与消息通知（Webhook/WebSocket）接入。

概览与快速开始

本指南覆盖 KOOK 的 HTTP 接口基础、版本管理、鉴权机制、速率限制、国际化设置、统一的请求/响应与分页约定，以及两种消息通知机制（Webhook 与 WebSocket）。读者完成本指南后，应能够在本地或服务器环境中完成最小可用对接。

本指南以官方页面为依据，关键事实以官方文档为准。[参考文档][1]

API 基础与版本管理

KOOK 的常规 HTTP 接口用于主动调用平台能力。统一的基础地址如下：

<https://www.kookapp.cn/api>

为了兼容不同版本，建议在路径中显式指定版本号：

<https://www.kookapp.cn/api/v>{version_number}

当省略版本号时，请求将指向当前“默认版本”。示例：





<https://www.kookapp.cn/api/v3/> 使用 v3 版本（文档中显示 v3 处于“开发中”，并标记为默认）。







版本



状态



默认





3



开发中



是

上述信息用于理解版本路径与默认版本的行为，具体端点以官方文档为准。[参考文档][1]

鉴权与安全实践

所有主动调用的请求都需要在 HTTP Header 中包含 Authorization 进行鉴权，格式为：

Authorization: TOKEN_TYPE TOKEN

目前支持两种类型：







类型



TOKEN_TYPE



场景说明





机器人



Bot



机器人/服务对接





OAuth2 用户



Bearer



代表用户的授权调用

机器人鉴权示例：

Authorization: Bot BHsTZ4232tLatgV5AFyjoqZGAHHmpl9mTxYQ/u4/80=

常见问题与建议：





确认 TOKEN_TYPE 与 TOKEN 之间有一个空格，避免拼写错误。



切勿将 Token 硬编码到仓库；建议使用环境变量或密钥管理服务。



定期轮换 Token，降低泄漏风险。[参考文档][1]

速率限制与重试策略

KOOK 为保护系统稳定性，基于 RFC 6585 扩展了速率限制机制。当频繁触发阈值或忽略限速错误，可能导致 API Key 被撤销并限制登录。[参考文档][1]

在客户端实现中建议：





监控 HTTP 429（Too Many Requests），一旦出现立即暂停后续请求。



使用指数退避策略（Exponential Backoff）进行重试。



如响应包含 Retry-After，严格遵守等待时间。

速率限制细节请以官方速率限制页面为准（文档中有链接指示）。

国际化（i18n）

若需本地化错误信息或提示，可设置 Accept-Language：

Accept-Language: en-US

系统在支持该语言时以对应语言返回消息；如不支持则以默认 zh-cn 返回。[参考文档][1]

通用请求与响应格式

接口区分为 GET 与 POST：





GET：用于获取数据。



POST：用于提交数据，默认为 JSON 提交，需设置：

Content-type: application/json

标准响应结构示例：

{
  "code": 0,        // 0 代表成功，非 0 代表失败
  "message": "...", // 文本消息（受 Accept-Language 影响）
  "data": { ... }   // 具体业务数据
}

注意：仅使用文档声明的字段；历史原因可能存在未文档化字段，不应依赖。[参考文档][1]

分页与通用参数

列表接口通常具备统一的请求参数与返回结构。

请求参数：







参数名



类型



说明





page



int



页码（通常从 1 开始）





page_size



int



每页数量（默认 50，最大 50）





sort



str



排序字段（如 id/-id）

返回结构（位于 data 内）：







字段



类型



说明





items



Array



当前页数据列表





meta



Object



分页元数据





» page



int



当前页码





» page_total



int



总页数（如文档端点提供）





» page_size



int



每页数量





» total



int



总数据量





sort



Map



分页排序：1 升序，-1 降序

上述分页参数与排序约定用于统一理解，具体支持字段以端点文档声明为准。[参考文档][1]

消息通知总览

KOOK 提供 Webhook 与 WebSocket 两种消息通知机制。两者在消息含义与结构上保持一致，并可能采用 zlib（deflate）压缩。[参考文档][1]

核心差异在于序列号 sn 的处理：







机制



sn 行为





Webhook



sn 到达 65535 后重新从 1 计算





WebSocket



sn 从 1 开始自增，无 65535 上限

Webhook 接入要点

Webhook 适用于具备公网可访问 HTTPS 服务的场景，通过 HTTP POST 接收推送。通用接入思路：





在服务器上暴露 HTTPS 回调地址。



在后台配置该地址，并按要求进行 Challenge 验证（原样返回 challenge 字段）。



对可能的压缩负载进行 zlib 解压（检测压缩标志或按官方字段约定）。



维护幂等与排序：记录 sn 或事件 ID 去重；注意 Webhook 的 sn 会在 65535 后重置。[参考文档][1]

WebSocket 接入要点

WebSocket 适用于本地开发或无公网 IP 的环境，建立长连接接收事件。通用接入思路：





获取网关地址（Gateway URL）。



建立连接并处理握手包。



对二进制数据按需进行 zlib 解压与消息解码。



维护心跳与重连：断线后使用最新 sn 继续会话，减少消息丢失。[参考文档][1]

开发环境与调试建议

为提升稳定性与安全性，建议在工程实现中加入以下实践：





将 Token 保存在环境变量（如 .env）中，并区分开发/生产配置。



记录关键请求的 Trace/状态码与响应 code 字段，建立报警（429、鉴权失败等）。



为鉴权、分页边界、压缩/解压与 sn 行为编写集成测试，确保幂等性与顺序性。

常见错误与排查







领域



典型现象



排查建议





鉴权



HTTP 401/403



校验 Authorization 格式与空格、类型（Bot/Bearer）。





速率



HTTP 429



实施限流与指数退避；尊重 Retry-After。





i18n



文案语言不符合预期



设置或确认 Accept-Language。





字段



解析失败或行为异常



避免依赖未文档化字段，以官方字段为准。





通知



乱码或无法解析



检查并正确处理 zlib 解压与消息编码。





sn



重复或乱序



Webhook 注意 65535 重置；WebSocket 做断线续传。

参考资料





KOOK 开发者中心 — KOOK API 和机器人开发文档. https://developer.kookapp.cn/doc/reference