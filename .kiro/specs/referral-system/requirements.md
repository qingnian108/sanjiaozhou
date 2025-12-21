# Requirements Document

## Introduction

邀请返佣系统，允许用户通过邀请码邀请新用户注册，当被邀请用户充值时，邀请人可获得一定比例的返佣奖励。系统支持一级返佣，默认比例10%，超级管理员可针对每个账户单独设置返佣比例。

## Glossary

- **Referral_System**: 邀请返佣系统，管理邀请关系和返佣计算
- **Inviter**: 邀请人，分享邀请码的用户
- **Invitee**: 被邀请人，使用邀请码注册的新用户
- **Invite_Code**: 邀请码，用户的唯一标识码（使用用户名作为邀请码）
- **Commission**: 返佣，被邀请人充值时给邀请人的奖励
- **Commission_Rate**: 返佣比例，默认10%，可由超管单独设置

## Requirements

### Requirement 1

**User Story:** As a 推广用户, I want to 获取我的专属邀请码, so that 我可以分享给朋友注册使用。

#### Acceptance Criteria

1. WHEN 用户登录系统 THEN the Referral_System SHALL 在账户页面显示用户的专属邀请码
2. WHEN 用户查看邀请码 THEN the Referral_System SHALL 提供一键复制邀请码和邀请链接的功能
3. WHEN 生成邀请链接 THEN the Referral_System SHALL 使用格式 `网站地址?ref=邀请码`

### Requirement 2

**User Story:** As a 新用户, I want to 在注册时填写邀请码, so that 我的邀请人可以获得返佣奖励。

#### Acceptance Criteria

1. WHEN 新用户注册 THEN the Referral_System SHALL 提供可选的邀请码输入框
2. WHEN 用户填写有效邀请码并完成注册 THEN the Referral_System SHALL 建立邀请人与被邀请人的绑定关系
3. WHEN 用户填写无效邀请码 THEN the Referral_System SHALL 提示邀请码无效但允许继续注册
4. WHEN 邀请关系建立后 THEN the Referral_System SHALL 永久保持该绑定关系不可更改

### Requirement 3

**User Story:** As a 邀请人, I want to 在被邀请人充值时获得返佣, so that 我可以通过推广获得收益。

#### Acceptance Criteria

1. WHEN 被邀请人完成充值 THEN the Referral_System SHALL 按邀请人的返佣比例计算返佣金额
2. WHEN 返佣计算完成 THEN the Referral_System SHALL 将返佣金额自动添加到邀请人的账户余额
3. WHEN 返佣发放 THEN the Referral_System SHALL 创建返佣记录包含充值金额、返佣比例、返佣金额、时间
4. THE Referral_System SHALL 使用默认返佣比例10%，除非超管单独设置了该账户的比例

### Requirement 4

**User Story:** As a 邀请人, I want to 查看我的邀请统计和返佣记录, so that 我可以了解推广效果和收益情况。

#### Acceptance Criteria

1. WHEN 用户查看邀请统计 THEN the Referral_System SHALL 显示邀请人数和累计返佣金额
2. WHEN 用户查看邀请列表 THEN the Referral_System SHALL 显示被邀请人列表（账号脱敏显示）和注册时间
3. WHEN 用户查看返佣记录 THEN the Referral_System SHALL 显示每笔返佣的详细信息

### Requirement 5

**User Story:** As a 超级管理员, I want to 管理用户的返佣比例, so that 我可以针对不同推广者设置不同的返佣政策。

#### Acceptance Criteria

1. WHEN 超管查看用户列表 THEN the Referral_System SHALL 显示每个用户的当前返佣比例
2. WHEN 超管编辑用户 THEN the Referral_System SHALL 允许修改该用户的返佣比例（0-100%）
3. WHEN 超管查看返佣统计 THEN the Referral_System SHALL 显示全平台返佣总额和各用户返佣明细
