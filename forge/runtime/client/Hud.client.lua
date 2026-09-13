--!strict
-- The whole player-facing UI, built in code so the place file stays data-only.
-- Currency counter, toast notifications, a round banner and the shop.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local Net = require(Shared:WaitForChild("Net"))
local Format = require(Shared:WaitForChild("Format"))

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local ACCENT = Color3.fromRGB(120, 200, 255)
local TONES = {
	info = Color3.fromRGB(120, 200, 255),
	good = Color3.fromRGB(120, 230, 160),
	warn = Color3.fromRGB(255, 200, 110),
}

local screen = Instance.new("ScreenGui")
screen.Name = "ForgeHud"
screen.ResetOnSpawn = false
screen.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screen.IgnoreGuiInset = true
screen.Parent = playerGui

local function corner(parent: Instance, radius: number)
	local ui = Instance.new("UICorner")
	ui.CornerRadius = UDim.new(0, radius)
	ui.Parent = parent
	return ui
end

local function padding(parent: Instance, amount: number)
	local ui = Instance.new("UIPadding")
	ui.PaddingTop = UDim.new(0, amount)
	ui.PaddingBottom = UDim.new(0, amount)
	ui.PaddingLeft = UDim.new(0, amount)
	ui.PaddingRight = UDim.new(0, amount)
	ui.Parent = parent
	return ui
end

--------------------------------------------------------------------------------
-- Currency counter
--------------------------------------------------------------------------------

local wallet = Instance.new("Frame")
wallet.Name = "Wallet"
wallet.AnchorPoint = Vector2.new(0.5, 0)
wallet.Position = UDim2.new(0.5, 0, 0, 16)
wallet.Size = UDim2.new(0, 230, 0, 52)
wallet.BackgroundColor3 = Color3.fromRGB(18, 20, 28)
wallet.BackgroundTransparency = 0.15
wallet.BorderSizePixel = 0
wallet.Parent = screen
corner(wallet, 12)

local walletLabel = Instance.new("TextLabel")
walletLabel.Name = "Amount"
walletLabel.Size = UDim2.fromScale(1, 1)
walletLabel.BackgroundTransparency = 1
walletLabel.Font = Enum.Font.GothamBold
walletLabel.TextSize = 22
walletLabel.TextColor3 = Color3.fromRGB(245, 246, 250)
walletLabel.Text = string.format("0 %s", Settings.currency.name)
walletLabel.Parent = wallet

local carriedLabel = Instance.new("TextLabel")
carriedLabel.Name = "Carried"
carriedLabel.AnchorPoint = Vector2.new(0.5, 0)
carriedLabel.Position = UDim2.new(0.5, 0, 1, 6)
carriedLabel.Size = UDim2.new(1, 0, 0, 20)
carriedLabel.BackgroundTransparency = 1
carriedLabel.Font = Enum.Font.Gotham
carriedLabel.TextSize = 15
carriedLabel.TextColor3 = Color3.fromRGB(170, 178, 196)
carriedLabel.Text = ""
carriedLabel.Visible = false
carriedLabel.Parent = wallet

--------------------------------------------------------------------------------
-- Toasts
--------------------------------------------------------------------------------

local toasts = Instance.new("Frame")
toasts.Name = "Toasts"
toasts.AnchorPoint = Vector2.new(0, 1)
toasts.Position = UDim2.new(0, 16, 1, -16)
toasts.Size = UDim2.new(0, 320, 0, 240)
toasts.BackgroundTransparency = 1
toasts.Parent = screen

local toastLayout = Instance.new("UIListLayout")
toastLayout.FillDirection = Enum.FillDirection.Vertical
toastLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
toastLayout.SortOrder = Enum.SortOrder.LayoutOrder
toastLayout.Padding = UDim.new(0, 6)
toastLayout.Parent = toasts

local toastOrder = 0

local function toast(message: string, tone: string)
	toastOrder += 1

	local card = Instance.new("Frame")
	card.Size = UDim2.new(1, 0, 0, 36)
	card.BackgroundColor3 = Color3.fromRGB(20, 22, 30)
	card.BackgroundTransparency = 0.1
	card.BorderSizePixel = 0
	card.LayoutOrder = toastOrder
	card.Parent = toasts
	corner(card, 8)

	local stripe = Instance.new("Frame")
	stripe.Size = UDim2.new(0, 3, 1, -12)
	stripe.Position = UDim2.new(0, 0, 0, 6)
	stripe.BackgroundColor3 = TONES[tone] or ACCENT
	stripe.BorderSizePixel = 0
	stripe.Parent = card
	corner(stripe, 2)

	local text = Instance.new("TextLabel")
	text.Size = UDim2.new(1, -20, 1, 0)
	text.Position = UDim2.new(0, 14, 0, 0)
	text.BackgroundTransparency = 1
	text.Font = Enum.Font.GothamMedium
	text.TextSize = 14
	text.TextXAlignment = Enum.TextXAlignment.Left
	text.TextColor3 = Color3.fromRGB(235, 238, 245)
	text.Text = message
	text.Parent = card

	task.delay(3.2, function()
		TweenService:Create(card, TweenInfo.new(0.35), { BackgroundTransparency = 1 }):Play()
		TweenService:Create(text, TweenInfo.new(0.35), { TextTransparency = 1 }):Play()
		TweenService:Create(stripe, TweenInfo.new(0.35), { BackgroundTransparency = 1 }):Play()
		task.wait(0.4)
		card:Destroy()
	end)
end

--------------------------------------------------------------------------------
-- Round banner (arena games)
--------------------------------------------------------------------------------

local banner = Instance.new("TextLabel")
banner.Name = "Round"
banner.AnchorPoint = Vector2.new(0.5, 0)
banner.Position = UDim2.new(0.5, 0, 0, 78)
banner.Size = UDim2.new(0, 300, 0, 28)
banner.BackgroundTransparency = 1
banner.Font = Enum.Font.GothamSemibold
banner.TextSize = 17
banner.TextColor3 = ACCENT
banner.Text = ""
banner.Visible = false
banner.Parent = screen

--------------------------------------------------------------------------------
-- Shop
--------------------------------------------------------------------------------

local shopItems = (Settings.shop and Settings.shop.items) or {}
local buyFn = Net.fn("Buy")

if #shopItems > 0 then
	local toggle = Instance.new("TextButton")
	toggle.Name = "ShopToggle"
	toggle.AnchorPoint = Vector2.new(1, 1)
	toggle.Position = UDim2.new(1, -16, 1, -16)
	toggle.Size = UDim2.new(0, 120, 0, 44)
	toggle.BackgroundColor3 = Color3.fromRGB(38, 92, 140)
	toggle.BorderSizePixel = 0
	toggle.Font = Enum.Font.GothamBold
	toggle.TextSize = 16
	toggle.TextColor3 = Color3.fromRGB(245, 248, 255)
	toggle.Text = "Shop"
	toggle.Parent = screen
	corner(toggle, 10)

	local panel = Instance.new("Frame")
	panel.Name = "Shop"
	panel.AnchorPoint = Vector2.new(0.5, 0.5)
	panel.Position = UDim2.fromScale(0.5, 0.5)
	panel.Size = UDim2.new(0, 360, 0, 400)
	panel.BackgroundColor3 = Color3.fromRGB(16, 18, 26)
	panel.BorderSizePixel = 0
	panel.Visible = false
	panel.Parent = screen
	corner(panel, 14)
	padding(panel, 16)

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, 0, 0, 30)
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.GothamBold
	title.TextSize = 20
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.TextColor3 = Color3.fromRGB(245, 246, 250)
	title.Text = "Shop"
	title.Parent = panel

	local close = Instance.new("TextButton")
	close.AnchorPoint = Vector2.new(1, 0)
	close.Position = UDim2.new(1, 0, 0, 0)
	close.Size = UDim2.new(0, 30, 0, 30)
	close.BackgroundTransparency = 1
	close.Font = Enum.Font.GothamBold
	close.TextSize = 20
	close.TextColor3 = Color3.fromRGB(170, 178, 196)
	close.Text = "X"
	close.Parent = panel

	local list = Instance.new("ScrollingFrame")
	list.Position = UDim2.new(0, 0, 0, 40)
	list.Size = UDim2.new(1, 0, 1, -40)
	list.BackgroundTransparency = 1
	list.BorderSizePixel = 0
	list.ScrollBarThickness = 4
	list.CanvasSize = UDim2.new()
	list.AutomaticCanvasSize = Enum.AutomaticSize.Y
	list.Parent = panel

	local listLayout = Instance.new("UIListLayout")
	listLayout.Padding = UDim.new(0, 8)
	listLayout.SortOrder = Enum.SortOrder.LayoutOrder
	listLayout.Parent = list

	for index, item in ipairs(shopItems) do
		local row = Instance.new("Frame")
		row.Size = UDim2.new(1, -8, 0, 62)
		row.BackgroundColor3 = Color3.fromRGB(24, 27, 37)
		row.BorderSizePixel = 0
		row.LayoutOrder = index
		row.Parent = list
		corner(row, 10)

		local name = Instance.new("TextLabel")
		name.Position = UDim2.new(0, 12, 0, 9)
		name.Size = UDim2.new(1, -110, 0, 20)
		name.BackgroundTransparency = 1
		name.Font = Enum.Font.GothamSemibold
		name.TextSize = 15
		name.TextXAlignment = Enum.TextXAlignment.Left
		name.TextColor3 = Color3.fromRGB(238, 241, 248)
		name.Text = item.name
		name.Parent = row

		local blurb = Instance.new("TextLabel")
		blurb.Position = UDim2.new(0, 12, 0, 30)
		blurb.Size = UDim2.new(1, -110, 0, 20)
		blurb.BackgroundTransparency = 1
		blurb.Font = Enum.Font.Gotham
		blurb.TextSize = 13
		blurb.TextXAlignment = Enum.TextXAlignment.Left
		blurb.TextColor3 = Color3.fromRGB(160, 168, 188)
		blurb.Text = item.description or ""
		blurb.Parent = row

		local buy = Instance.new("TextButton")
		buy.AnchorPoint = Vector2.new(1, 0.5)
		buy.Position = UDim2.new(1, -10, 0.5, 0)
		buy.Size = UDim2.new(0, 86, 0, 34)
		buy.BackgroundColor3 = Color3.fromRGB(38, 92, 140)
		buy.BorderSizePixel = 0
		buy.Font = Enum.Font.GothamBold
		buy.TextSize = 14
		buy.TextColor3 = Color3.fromRGB(245, 248, 255)
		buy.Text = Format.short(item.price)
		buy.Parent = row
		corner(buy, 8)

		buy.Activated:Connect(function()
			buy.Text = "..."
			local ok, result = pcall(function()
				return buyFn:InvokeServer(item.id)
			end)
			buy.Text = Format.short(item.price)
			if ok and type(result) == "table" and result.ok then
				buy.Text = "Owned"
				buy.BackgroundColor3 = Color3.fromRGB(46, 120, 82)
				buy.Active = false
			elseif ok and type(result) == "table" then
				toast(result.message or "Could not buy that", "warn")
			end
		end)
	end

	toggle.Activated:Connect(function()
		panel.Visible = not panel.Visible
	end)
	close.Activated:Connect(function()
		panel.Visible = false
	end)
end

--------------------------------------------------------------------------------
-- Server feeds
--------------------------------------------------------------------------------

Net.event("Hud").OnClientEvent:Connect(function(state)
	if type(state) ~= "table" then
		return
	end
	walletLabel.Text = string.format("%s %s", Format.commas(state.coins or 0), Settings.currency.name)
	if Settings.backpack then
		carriedLabel.Visible = true
		carriedLabel.Text = string.format("Carrying %d", state.carried or 0)
	end
end)

Net.event("Notify").OnClientEvent:Connect(function(message, tone)
	if type(message) == "string" then
		toast(message, type(tone) == "string" and tone or "info")
	end
end)

Net.event("Round").OnClientEvent:Connect(function(state)
	if type(state) ~= "table" then
		return
	end
	banner.Visible = true
	if state.seconds and state.seconds > 0 then
		banner.Text = string.format("%s -- %d:%02d", state.message or "", math.floor(state.seconds / 60), state.seconds % 60)
	else
		banner.Text = state.message or ""
	end
end)
