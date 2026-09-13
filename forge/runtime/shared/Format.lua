--!strict
-- Shared number formatting so the HUD and server notifications agree.

local Format = {}

local SUFFIXES = { "", "K", "M", "B", "T", "Qa", "Qi" }

function Format.short(value: number): string
	local n = math.floor(value + 0.5)
	local tier = 1
	local scaled = n
	while math.abs(scaled) >= 1000 and tier < #SUFFIXES do
		scaled = scaled / 1000
		tier += 1
	end
	if tier == 1 then
		return tostring(n)
	end
	local rounded = math.floor(scaled * 10 + 0.5) / 10
	return string.format("%s%s", tostring(rounded), SUFFIXES[tier])
end

function Format.commas(value: number): string
	local text = tostring(math.floor(value + 0.5))
	local out = text:reverse():gsub("(%d%d%d)", "%1,"):reverse()
	return (out:gsub("^,", ""))
end

return Format
